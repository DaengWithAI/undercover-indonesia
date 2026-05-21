// api/words.ts
// CRUD endpoint untuk word pairs di Upstash Redis
// GET    /api/words          → ambil semua word pairs
// POST   /api/words          → tambah word pair baru
// DELETE /api/words?id=xxx   → hapus word pair by id

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.pdst_KV_REST_API_URL!,
  token: process.env.pdst_KV_REST_API_TOKEN!,
});

const WORDS_KEY = "undercover:words";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

export interface WordPair {
  id: string;
  c: string; // civilian word
  u: string; // undercover word
  createdAt: number;
}

function unauthorized(res: any) {
  return res.status(401).json({ error: "Unauthorized" });
}

function validateSecret(req: any): boolean {
  const auth = req.headers["x-admin-secret"] ?? req.query?.secret ?? "";
  return ADMIN_SECRET !== "" && auth === ADMIN_SECRET;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  // ── GET — public, no auth needed ─────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const pairs = await kv.get<WordPair[]>(WORDS_KEY);
      return res.status(200).json({ pairs: pairs ?? [], total: pairs?.length ?? 0 });
    } catch (err) {
      console.error("[words:GET]", err);
      return res.status(500).json({ error: "Gagal mengambil data" });
    }
  }

  // ── All mutations require auth ────────────────────────────────────────────
  if (!validateSecret(req)) return unauthorized(res);

  // ── POST — tambah word pair ───────────────────────────────────────────────
  if (req.method === "POST") {
    const { c, u } = req.body ?? {};

    if (!c?.trim() || !u?.trim()) {
      return res.status(400).json({ error: "Kata civilian dan undercover wajib diisi" });
    }
    if (c.trim().length > 50 || u.trim().length > 50) {
      return res.status(400).json({ error: "Kata maksimal 50 karakter" });
    }

    try {
      const pairs = (await kv.get<WordPair[]>(WORDS_KEY)) ?? [];

      // Cek duplikat (case-insensitive)
      const isDuplicate = pairs.some(
        (p) =>
          p.c.toLowerCase() === c.trim().toLowerCase() &&
          p.u.toLowerCase() === u.trim().toLowerCase()
      );
      if (isDuplicate) {
        return res.status(409).json({ error: "Pasangan kata ini sudah ada" });
      }

      const newPair: WordPair = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
        c: c.trim(),
        u: u.trim(),
        createdAt: Date.now(),
      };

      await kv.set(WORDS_KEY, [...pairs, newPair]);
      return res.status(201).json({ pair: newPair, total: pairs.length + 1 });
    } catch (err) {
      console.error("[words:POST]", err);
      return res.status(500).json({ error: "Gagal menyimpan data" });
    }
  }

  // ── DELETE — hapus word pair by id ───────────────────────────────────────
  if (req.method === "DELETE") {
    const { id } = req.query ?? {};

    if (!id) {
      return res.status(400).json({ error: "ID diperlukan" });
    }

    try {
      const pairs = (await kv.get<WordPair[]>(WORDS_KEY)) ?? [];
      const filtered = pairs.filter((p) => p.id !== id);

      if (filtered.length === pairs.length) {
        return res.status(404).json({ error: "Kata tidak ditemukan" });
      }

      await kv.set(WORDS_KEY, filtered);
      return res.status(200).json({ deleted: id, total: filtered.length });
    } catch (err) {
      console.error("[words:DELETE]", err);
      return res.status(500).json({ error: "Gagal menghapus data" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}