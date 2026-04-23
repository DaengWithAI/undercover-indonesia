import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WORD_PAIRS } from "./src/data/wordList.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Filter out any invalid word pairs
  const VALID_WORDS = WORD_PAIRS.filter(p => p.c && p.u);

  // API Route to get a random word pair
  app.get("/api/random-pair", (req, res) => {
    const randomIndex = Math.floor(Math.random() * VALID_WORDS.length);
    const pair = VALID_WORDS[randomIndex];
    
    // Serve plain text directly from the server
    res.json({
      civilian: pair.c,
      undercover: pair.u,
      totalPairs: VALID_WORDS.length
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
