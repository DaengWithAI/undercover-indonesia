import { OBFUSCATED_WORD_PAIRS } from "../src/data/wordList.ts";

export default function handler(req: any, res: any) {
  const decode = (str: string) => Buffer.from(str, "base64").toString("utf-8");
  
  const randomIndex = Math.floor(Math.random() * OBFUSCATED_WORD_PAIRS.length);
  const obfuscatedPair = OBFUSCATED_WORD_PAIRS[randomIndex];
  
  res.status(200).json({
    civilian: decode(obfuscatedPair.c),
    undercover: decode(obfuscatedPair.u)
  });
}
