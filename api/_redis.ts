// api/_redis.ts
// Upstash Redis REST client — zero dependencies, native fetch only

const REDIS_URL = process.env.pdst_KV_REST_API_URL ?? process.env.KV_REST_API_URL ?? "";
const REDIS_TOKEN = process.env.pdst_KV_REST_API_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

async function redisCmd(...args: (string | number)[]): Promise<any> {
  const res = await fetch(`${REDIS_URL}`, {
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

export async function kvGet<T>(key: string): Promise<T | null> {
  const raw = await redisCmd("GET", key);
  if (raw === null) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await redisCmd("SET", key, JSON.stringify(value));
}