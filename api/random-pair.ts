// api/random-pair.ts
// Fetch dari Upstash Redis. Tidak ada lagi dependensi ke wordData.ts.

import { Redis } from "@upstash/redis";
import type { WordPair } from "./words";

const kv = new Redis({
  url: process.env.pdst_KV_REST_API_URL!,
  token: process.env.pdst_KV_REST_API_TOKEN!,
});

const WORDS_KEY = "undercover:words";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");

  try {
    const pairs = await kv.get<WordPair[]>(WORDS_KEY);

    if (!pairs || pairs.length === 0) {
      return res.status(503).json({
        error: "Belum ada kata tersedia. Jalankan migrasi terlebih dahulu.",
      });
    }

    const randomIndex = Math.floor(Math.random() * pairs.length);
    const pair = pairs[randomIndex];

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