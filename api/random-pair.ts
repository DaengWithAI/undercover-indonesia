import { OBFUSCATED_WORD_PAIRS } from "../src/data/wordList";

export default function handler(req: any, res: any) {
  try {
    const decode = (str: string) => Buffer.from(str, "base64").toString("utf-8");
    
    if (!OBFUSCATED_WORD_PAIRS || OBFUSCATED_WORD_PAIRS.length === 0) {
      throw new Error("Word list is empty or not loaded");
    }

    const randomIndex = Math.floor(Math.random() * OBFUSCATED_WORD_PAIRS.length);
    const obfuscatedPair = OBFUSCATED_WORD_PAIRS[randomIndex];
    
    res.status(200).json({
      civilian: decode(obfuscatedPair.c),
      undercover: decode(obfuscatedPair.u)
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch word pair", 
      details: error.message 
    });
  }
}
