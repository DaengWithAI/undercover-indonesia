// api/words.ts

const REDIS_URL = process.env.pdst_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "";
const REDIS_TOKEN = process.env.pdst_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

async function redisCmd(...args: (string | number)[]): Promise<any> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
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

const WORDS_KEY = "undercover:words";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

export interface WordPair {
  id: string; c: string; u: string; createdAt: number;
}

function validateSecret(req: any): boolean {
  const auth = req.headers["x-admin-secret"] ?? req.query?.secret ?? "";
  return ADMIN_SECRET !== "" && auth === ADMIN_SECRET;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const pairs = await kvGet<WordPair[]>(WORDS_KEY);
      return res.status(200).json({ pairs: pairs ?? [], total: pairs?.length ?? 0 });
    } catch (err) {
      console.error("[words:GET]", err);
      return res.status(500).json({ error: "Gagal mengambil data" });
    }
  }

  if (!validateSecret(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "POST") {
    const { c, u } = req.body ?? {};
    if (!c?.trim() || !u?.trim())
      return res.status(400).json({ error: "Kata civilian dan undercover wajib diisi" });
    if (c.trim().length > 50 || u.trim().length > 50)
      return res.status(400).json({ error: "Kata maksimal 50 karakter" });
    if (c.trim() === "__test__")
      return res.status(400).json({ error: "Test call — auth OK" });
    try {
      const pairs = (await kvGet<WordPair[]>(WORDS_KEY)) ?? [];
      const isDuplicate = pairs.some(
        (p) => p.c.toLowerCase() === c.trim().toLowerCase() &&
               p.u.toLowerCase() === u.trim().toLowerCase()
      );
      if (isDuplicate) return res.status(409).json({ error: "Pasangan kata ini sudah ada" });
      const newPair: WordPair = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
        c: c.trim(), u: u.trim(), createdAt: Date.now(),
      };
      await kvSet(WORDS_KEY, [...pairs, newPair]);
      return res.status(201).json({ pair: newPair, total: pairs.length + 1 });
    } catch (err) {
      console.error("[words:POST]", err);
      return res.status(500).json({ error: "Gagal menyimpan data" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query ?? {};
    if (!id) return res.status(400).json({ error: "ID diperlukan" });
    try {
      const pairs = (await kvGet<WordPair[]>(WORDS_KEY)) ?? [];
      const filtered = pairs.filter((p) => p.id !== id);
      if (filtered.length === pairs.length)
        return res.status(404).json({ error: "Kata tidak ditemukan" });
      await kvSet(WORDS_KEY, filtered);
      return res.status(200).json({ deleted: id, total: filtered.length });
    } catch (err) {
      console.error("[words:DELETE]", err);
      return res.status(500).json({ error: "Gagal menghapus data" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}