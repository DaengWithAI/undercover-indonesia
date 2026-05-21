// api/random-pair.ts
import { kvGet } from "./_redis";

const WORDS_KEY = "undercover:words";

interface WordPair { id: string; c: string; u: string; createdAt: number; }

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");

  try {
    const pairs = await kvGet<WordPair[]>(WORDS_KEY);

    if (!pairs || pairs.length === 0) {
      return res.status(503).json({
        error: "Belum ada kata tersedia. Jalankan migrasi terlebih dahulu.",
      });
    }

    const idx = Math.floor(Math.random() * pairs.length);
    const pair = pairs[idx];

    return res.status(200).json({
      civilian: pair.c,
      undercover: pair.u,
      totalPairs: pairs.length,
    });
  } catch (err) {
    console.error("[random-pair]", err);
    return res.status(500).json({ error: "Gagal mengambil kata" });
  }
}