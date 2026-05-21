// api/random-pair.ts

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

interface WordPair { id: string; c: string; u: string; createdAt: number; }

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");
  try {
    const pairs = await kvGet<WordPair[]>(WORDS_KEY);
    if (!pairs || pairs.length === 0) {
      return res.status(503).json({ error: "Belum ada kata tersedia. Jalankan migrasi terlebih dahulu." });
    }
    const idx = Math.floor(Math.random() * pairs.length);
    const pair = pairs[idx];
    return res.status(200).json({ civilian: pair.c, undercover: pair.u, totalPairs: pairs.length });
  } catch (err) {
    console.error("[random-pair]", err);
    return res.status(500).json({ error: "Gagal mengambil kata" });
  }
}