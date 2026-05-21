// api/group.ts
// GET  /api/group/:code        → ambil data grup (leaderboard + players)
// POST /api/group/:code        → update nama pemain baru di grup
// PUT  /api/group/:code/score  → submit skor setelah ronde selesai

const REDIS_URL   = process.env.pdst_KV_REST_API_URL   ?? process.env.KV_REST_API_URL   ?? "";
const REDIS_TOKEN = process.env.pdst_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

async function redisCmd(...args: (string | number)[]): Promise<any> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const { result } = await res.json();
  return result;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const raw = await redisCmd("GET", key);
  if (raw === null) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  await redisCmd("SET", key, JSON.stringify(value));
}


interface PlayerStreak { role: "CIVILIAN" | "UNDERCOVER"; count: number; }
interface PlayerStats  { points: number; streak: PlayerStreak; lastRoundIndex: number; }
interface GroupData    {
  players: string[];
  leaderboard: Record<string, PlayerStats>;
  roundIndex: number;
  createdAt: number;
}
interface ScoreDelta   {
  name: string;
  role: "CIVILIAN" | "UNDERCOVER";
  points: number;
  won: boolean;
  eliminatedAtRound: number | null;
}
interface SubmitPayload {
  roundIndex: number;
  deltas: ScoreDelta[];
}

const GROUP_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 hari

function groupKey(code: string): string {
  return `group:${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
}

function emptyGroup(): GroupData {
  return { players: [], leaderboard: {}, roundIndex: 0, createdAt: Date.now() };
}

function applyStreakBonus(
  stats: PlayerStats,
  delta: ScoreDelta,
  incomingRoundIndex: number
): number {
  let bonus = 0;
  const skipped = stats.lastRoundIndex !== incomingRoundIndex - 1 && stats.lastRoundIndex !== 0;

  if (!delta.won || skipped) {
    stats.streak = { role: delta.role, count: delta.won ? 1 : 0 };
  } else if (delta.role === stats.streak.role) {
    stats.streak.count++;
    if (stats.streak.count === 2) bonus = 2;
    else if (stats.streak.count >= 3) bonus = 3;
  } else {
    stats.streak = { role: delta.role, count: 1 };
  }

  return bonus;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  const code = req.query?.code as string;

  if (!code || code.length < 2 || code.length > 8) {
    return res.status(400).json({ error: "Kode grup tidak valid (2–8 karakter)" });
  }

  const key = groupKey(code);

  // ── GET — ambil data grup ─────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const data = await kvGet<GroupData>(key);
      if (!data) {
        // Grup baru — return empty, jangan simpan dulu
        return res.status(200).json({ ...emptyGroup(), isNew: true });
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error("[group:GET]", err);
      return res.status(500).json({ error: "Gagal mengambil data grup" });
    }
  }

  // ── POST — tambah nama pemain baru ke grup ────────────────────────────────
  if (req.method === "POST") {
    const { name } = req.body ?? {};
    if (!name?.trim() || name.trim().length > 30) {
      return res.status(400).json({ error: "Nama tidak valid" });
    }
    try {
      const data = (await kvGet<GroupData>(key)) ?? emptyGroup();
      const trimmed = name.trim();
      if (!data.players.includes(trimmed)) {
        data.players = [...data.players, trimmed];
        if (!data.createdAt) data.createdAt = Date.now();
        await kvSet(key, data);
        await redisCmd("EXPIRE", key, GROUP_TTL_SECONDS);
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error("[group:POST]", err);
      return res.status(500).json({ error: "Gagal menyimpan pemain" });
    }
  }

  // ── PUT — submit skor setelah ronde selesai ───────────────────────────────
  if (req.method === "PUT") {
    const payload = req.body as SubmitPayload;
    if (!payload?.deltas || !Array.isArray(payload.deltas) || payload.deltas.length === 0) {
      return res.status(400).json({ error: "Delta tidak valid" });
    }

    try {
      const data = (await kvGet<GroupData>(key)) ?? emptyGroup();
      const newRoundIndex = data.roundIndex + 1;

      for (const delta of payload.deltas) {
        if (!delta.name?.trim()) continue;
        const name = delta.name.trim();

        // Init stats kalau pemain baru
        if (!data.leaderboard[name]) {
          data.leaderboard[name] = {
            points: 0,
            streak: { role: delta.role, count: 0 },
            lastRoundIndex: 0,
          };
        }

        const stats = data.leaderboard[name];
        const streakBonus = applyStreakBonus(stats, delta, newRoundIndex);
        stats.points += delta.points + streakBonus;
        stats.lastRoundIndex = newRoundIndex;

        // Tambah ke players list kalau belum ada
        if (!data.players.includes(name)) {
          data.players = [...data.players, name];
        }
      }

      data.roundIndex = newRoundIndex;
      if (!data.createdAt) data.createdAt = Date.now();

      await kvSet(key, data);
      await redisCmd("EXPIRE", key, GROUP_TTL_SECONDS);

      return res.status(200).json(data);
    } catch (err) {
      console.error("[group:PUT]", err);
      return res.status(500).json({ error: "Gagal menyimpan skor" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}