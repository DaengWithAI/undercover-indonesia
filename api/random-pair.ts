import { WORD_PAIRS } from "./wordData.js";

const VALID_WORDS = WORD_PAIRS.filter((p) => p.c && p.u);

export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");

  try {
    const randomIndex = Math.floor(Math.random() * VALID_WORDS.length);
    const pair = VALID_WORDS[randomIndex];

    return res.status(200).json({
      civilian: pair.c,
      undercover: pair.u,
      totalPairs: VALID_WORDS.length,
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengambil data" });
  }
}