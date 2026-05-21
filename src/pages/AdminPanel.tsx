// src/pages/AdminPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Trash2, LogOut, RefreshCw, Search, X,
  Database, ChevronUp, ChevronDown, Upload,
  AlertTriangle, CheckCircle, Lock,
} from "lucide-react";

interface WordPair {
  id: string;
  c: string;
  u: string;
  createdAt: number;
}

type Toast = { type: "success" | "error"; message: string } | null;
type SortKey = "c" | "u" | "createdAt";
type SortDir = "asc" | "desc";

function lsGet(key: string, fb: string) {
  try { return localStorage.getItem(key) ?? fb; } catch { return fb; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { }
}
function fmt(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function AdminPanel() {
  const [secret, setSecret] = useState(() => lsGet("admin_secret", ""));
  const [secretInput, setSecretInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [pairs, setPairs] = useState<WordPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const [newC, setNewC] = useState("");
  const [newU, setNewU] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<WordPair | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [toast, setToast] = useState<Toast>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const newCRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async () => {
    if (!secretInput.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secretInput.trim() },
        body: JSON.stringify({ c: "__test__", u: "__test__" }),
      });
      if (res.status === 401) { setAuthError("Password salah"); return; }
      lsSet("admin_secret", secretInput.trim());
      setSecret(secretInput.trim());
      setIsAuthenticated(true);
    } catch {
      setAuthError("Tidak bisa terhubung ke server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSecret("");
    setSecretInput("");
    lsSet("admin_secret", "");
  };

  const fetchPairs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/words");
      const data = await res.json();
      setPairs(data.pairs ?? []);
    } catch {
      showToast("error", "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (secret) setIsAuthenticated(true); }, []);
  useEffect(() => { if (isAuthenticated) fetchPairs(); }, [isAuthenticated, fetchPairs]);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) { showToast("error", data.error ?? "Gagal"); return; }
      showToast("success", `+${data.added} kata diimport · Total ${data.total}`);
      await fetchPairs();
    } catch {
      showToast("error", "Migrasi gagal");
    } finally {
      setMigrating(false);
    }
  };

  const handleAdd = async () => {
    if (!newC.trim() || !newU.trim() || adding) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ c: newC.trim(), u: newU.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Gagal"); return; }
      setPairs((prev) => [data.pair, ...prev]);
      setNewC("");
      setNewU("");
      setPage(1);
      setSortKey("createdAt");
      setSortDir("desc");
      showToast("success", `"${data.pair.c}" · "${data.pair.u}" ditambahkan`);
      newCRef.current?.focus();
    } catch {
      setAddError("Gagal menambahkan");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (pair: WordPair) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/words?id=${pair.id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) { showToast("error", data.error ?? "Gagal"); return; }
      setPairs((prev) => prev.filter((p) => p.id !== pair.id));
      setDeleteTarget(null);
      showToast("success", `"${pair.c}" · "${pair.u}" dihapus`);
    } catch {
      showToast("error", "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = pairs
    .filter((p) =>
      p.c.toLowerCase().includes(search.toLowerCase()) ||
      p.u.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = sortKey === "createdAt" ? a.createdAt : a[sortKey].toLowerCase();
      const bv = sortKey === "createdAt" ? b.createdAt : b[sortKey].toLowerCase();
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── LOGIN ─────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111318] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-center justify-center">
              <Lock size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Admin Panel</p>
              <p className="text-[#555B6A] text-[10px] mt-0.5 font-mono">undercover-indo</p>
            </div>
          </div>
          <div className="bg-[#1A1D26] border border-[#2A2D3A] rounded-xl p-5 space-y-3">
            <input
              type="password"
              value={secretInput}
              onChange={(e) => { setSecretInput(e.target.value); setAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Secret key"
              autoFocus
              className="w-full bg-[#111318] border border-[#2A2D3A] rounded-lg px-3 py-2.5 text-white text-sm font-mono outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[#3A3F4E]"
            />
            {authError && (
              <p className="text-red-400 text-xs flex items-center gap-1.5 font-mono">
                <AlertTriangle size={12} /> {authError}
              </p>
            )}
            <button
              onClick={handleLogin}
              disabled={authLoading || !secretInput.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {authLoading
                ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}><RefreshCw size={14} /></motion.div>
                : "Sign in"
              }
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111318] text-white">

      {/* Topbar */}
      <div className="bg-[#1A1D26] border-b border-[#2A2D3A] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-500/15 border border-emerald-500/20 rounded-lg flex items-center justify-center">
            <Database size={13} className="text-emerald-400" />
          </div>
          <span className="font-semibold text-sm text-white">Word Pairs</span>
          <span className="text-[#3A3F4E] text-sm">/</span>
          <span className="text-[#555B6A] text-xs font-mono">undercover-indo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#555B6A] text-xs font-mono">{pairs.length} records</span>
          <button onClick={fetchPairs} disabled={loading} className="p-1.5 text-[#555B6A] hover:text-white transition-colors">
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}>
              <RefreshCw size={14} />
            </motion.div>
          </button>
          <button onClick={handleLogout} className="p-1.5 text-[#555B6A] hover:text-red-400 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Kata", value: pairs.length, color: "text-emerald-400", border: "border-emerald-500/20" },
            { label: "Hasil Filter", value: filtered.length, color: "text-sky-400", border: "border-sky-500/20" },
            { label: "Halaman", value: `${page} / ${totalPages || 1}`, color: "text-violet-400", border: "border-violet-500/20" },
          ].map((s) => (
            <div key={s.label} className={`bg-[#1A1D26] border ${s.border} rounded-xl px-4 py-3`}>
              <p className="text-[#555B6A] text-[10px] uppercase tracking-widest font-mono">{s.label}</p>
              <p className={`${s.color} text-2xl font-bold mt-0.5 font-mono`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add form */}
        <div className="bg-[#1A1D26] border border-[#2A2D3A] rounded-xl px-5 py-4">
          <p className="text-[#555B6A] text-[10px] font-mono uppercase tracking-widest mb-3">Tambah Kata Baru</p>
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest block">Civilian</label>
              <input
                ref={newCRef}
                type="text"
                value={newC}
                onChange={(e) => { setNewC(e.target.value); setAddError(""); }}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("input-u")?.focus()}
                placeholder="misal: Kopi"
                maxLength={50}
                className="w-full bg-[#111318] border border-[#2A2D3A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[#3A3F4E]"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-mono text-orange-400/80 uppercase tracking-widest block">Undercover</label>
              <input
                id="input-u"
                type="text"
                value={newU}
                onChange={(e) => { setNewU(e.target.value); setAddError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="misal: Teh"
                maxLength={50}
                className="w-full bg-[#111318] border border-[#2A2D3A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/50 transition-colors placeholder:text-[#3A3F4E]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-transparent select-none block font-mono">–</label>
              <button
                onClick={handleAdd}
                disabled={adding || !newC.trim() || !newU.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
              >
                {adding
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}><RefreshCw size={14} /></motion.div>
                  : <><Plus size={14} /> Tambah</>
                }
              </button>
            </div>
          </div>
          {addError && (
            <p className="text-red-400 text-xs flex items-center gap-1.5 mt-2 font-mono">
              <AlertTriangle size={12} /> {addError}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="bg-[#1A1D26] border border-[#2A2D3A] rounded-xl overflow-hidden">

          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-[#2A2D3A] flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3F4E]" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari kata..."
                className="w-full bg-[#111318] border border-[#2A2D3A] rounded-lg px-3 py-1.5 pl-8 text-white text-sm outline-none focus:border-sky-500/40 transition-colors placeholder:text-[#3A3F4E]"
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3A3F4E] hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              {pairs.length < 100 && (
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/20 transition-colors flex items-center gap-1.5"
                >
                  {migrating
                    ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}><RefreshCw size={12} /></motion.div>
                    : <><Upload size={12} /> Import 568 kata</>
                  }
                </button>
              )}
              <span className="text-[#555B6A] text-xs font-mono">
                {filtered.length > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length}` : "0 hasil"}
              </span>
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_96px_44px] bg-[#14161E] border-b border-[#2A2D3A]">
            {([
              { key: "c" as SortKey, label: "Civilian" },
              { key: "u" as SortKey, label: "Undercover" },
              { key: "createdAt" as SortKey, label: "Tanggal" },
            ] as { key: SortKey; label: string }[]).map((col) => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className="px-4 py-2.5 text-left flex items-center gap-1 text-[#555B6A] text-[10px] font-mono uppercase tracking-widest hover:text-white transition-colors"
              >
                {col.label}
                <span className="flex flex-col ml-0.5">
                  <ChevronUp size={8} className={sortKey === col.key && sortDir === "asc" ? "text-emerald-400" : "opacity-20"} />
                  <ChevronDown size={8} className={sortKey === col.key && sortDir === "desc" ? "text-emerald-400" : "opacity-20"} />
                </span>
              </button>
            ))}
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#1F2230]">
            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                  <RefreshCw size={18} className="text-[#3A3F4E]" />
                </motion.div>
              </div>
            ) : paginated.length === 0 ? (
              <div className="py-14 text-center text-[#3A3F4E] text-sm font-mono">
                {pairs.length === 0
                  ? <>Belum ada data. <button onClick={handleMigrate} className="text-violet-400 underline underline-offset-2">Import 568 kata</button></>
                  : "Tidak ada hasil."
                }
              </div>
            ) : (
              <AnimatePresence>
                {paginated.map((pair, idx) => (
                  <motion.div
                    key={pair.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: idx * 0.008 }}
                    className="grid grid-cols-[1fr_1fr_96px_44px] hover:bg-[#1F2230] transition-colors group"
                  >
                    <div className="px-4 py-2.5 text-sm text-white truncate">{pair.c}</div>
                    <div className="px-4 py-2.5 text-sm text-orange-400 truncate">{pair.u}</div>
                    <div className="px-4 py-2.5 text-xs text-[#555B6A] font-mono">{fmt(pair.createdAt)}</div>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setDeleteTarget(pair)}
                        className="p-1.5 text-[#3A3F4E] hover:text-red-400 group-hover:text-[#555B6A] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[#2A2D3A] bg-[#14161E] px-4 py-2.5 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-[#555B6A] hover:text-white disabled:opacity-30 text-xs font-mono transition-colors"
              >
                ← Prev
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1
                    : page <= 4 ? i + 1
                    : page >= totalPages - 3 ? totalPages - 6 + i
                    : page - 3 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded text-xs font-mono transition-colors ${
                        page === p ? "bg-emerald-600 text-white" : "text-[#555B6A] hover:text-white hover:bg-[#2A2D3A]"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-[#555B6A] hover:text-white disabled:opacity-30 text-xs font-mono transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-[#1A1D26] border border-[#2A2D3A] rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 size={14} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Hapus pasangan kata?</p>
                  <p className="text-[#555B6A] text-xs mt-1.5 font-mono">
                    <span className="text-white">"{deleteTarget.c}"</span>
                    <span className="mx-1.5">vs</span>
                    <span className="text-orange-400">"{deleteTarget.u}"</span>
                  </p>
                  <p className="text-[#3A3F4E] text-xs mt-1">Tidak bisa dibatalkan.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-[#555B6A] hover:text-white text-xs font-semibold transition-colors">
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleting
                    ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}><RefreshCw size={12} /></motion.div>
                    : "Hapus"
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xl z-[100] whitespace-nowrap border font-mono ${
              toast.type === "success"
                ? "bg-[#1A1D26] border-emerald-500/30 text-emerald-400"
                : "bg-[#1A1D26] border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}