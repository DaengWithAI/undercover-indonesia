import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { OBFUSCATED_WORD_PAIRS } from "./src/data/wordList.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const decode = (str: string) => Buffer.from(str, "base64").toString("utf-8");

  // API Route to get a random word pair
  app.get("/api/random-pair", (req, res) => {
    const randomIndex = Math.floor(Math.random() * OBFUSCATED_WORD_PAIRS.length);
    const obfuscatedPair = OBFUSCATED_WORD_PAIRS[randomIndex];
    
    // Decode server-side so it's only available for this specific request
    res.json({
      civilian: decode(obfuscatedPair.c),
      undercover: decode(obfuscatedPair.u)
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
