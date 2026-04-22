import { OBFUSCATED_WORD_PAIRS } from "./wordData";

export default function handler(req: any, res: any) {
  // Set headers to prevent caching
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");

  try {
    const decode = (str: string) => {
      try {
        return Buffer.from(str, "base64").toString("utf-8");
      } catch (e) {
        return "error_decode";
      }
    };
    
    if (!OBFUSCATED_WORD_PAIRS || !Array.isArray(OBFUSCATED_WORD_PAIRS) || OBFUSCATED_WORD_PAIRS.length === 0) {
      return res.status(500).json({ error: "Data kata tidak ditemukan" });
    }

    const randomIndex = Math.floor(Math.random() * OBFUSCATED_WORD_PAIRS.length);
    const obfuscatedPair = OBFUSCATED_WORD_PAIRS[randomIndex];
    
    return res.status(200).json({
      civilian: decode(obfuscatedPair.c),
      undercover: decode(obfuscatedPair.u)
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: "Gagal mengambil pasangan kata", 
      details: error.message 
    });
  }
}
