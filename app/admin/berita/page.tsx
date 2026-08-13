"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { headerAdmin } from "@/lib/admin-key";
import { formatWaktuRelatif } from "@/lib/utils";

const WARNA_STATUS: Record<string, string> = {
  hoax: "bg-rose-100 text-rose-700",
  fakta: "bg-emerald-100 text-emerald-700",
  mencurigakan: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-500",
};

const OPSI_STATUS = [
  { nilai: "", label: "Semua status" },
  { nilai: "hoax", label: "Hoax" },
  { nilai: "fakta", label: "Fakta" },
  { nilai: "mencurigakan", label: "Mencurigakan" },
  { nilai: "pending", label: "Pending" },
];

interface BarisBerita {
  id: string;
  judul: string;
  url: string;
  sumber: string;
  status: string;
  confidence: number | null;
  kategori: string | null;
  created_at: string;
}

export default function KelolaBeritaPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<BarisBerita[] | null>(null);
  const [gagal, setGagal] = useState(false);
  const [menghapusId, setMenghapusId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tipe: "sukses" | "gagal"; pesan: string } | null>(null);

  async function muat() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    try {
      const res = await fetch(`/api/admin?${params.toString()}`, {
        headers: headerAdmin(sessionStorage.getItem("ckh_admin_key") ?? ""),
      });
      if (!res.ok) {
        setGagal(true);
        return;
      }
      const d = (await res.json()) as { berita?: BarisBerita[] };
      setData(d.berita ?? []);
      setGagal(false);
    } catch {
      setGagal(true);
    }
  }

  useEffect(() => {
    const timer = setTimeout(muat, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  async function hapus(id: string) {
    if (menghapusId || !confirm("Hapus berita ini? Tindakan tidak dapat dibatalkan.")) return;
    setMenghapusId(id);
    try {
      const res = await fetch("/api/admin/hapus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headerAdmin(sessionStorage.getItem("ckh_admin_key") ?? ""),
        },
        body: JSON.stringify({ id }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Gagal menghapus.");
      setToast({ tipe: "sukses", pesan: "Berita dihapus." });
      setData((prev) => (prev ?? []).filter((b) => b.id !== id));
    } catch (e) {
      setToast({
        tipe: "gagal",
        pesan: e instanceof Error ? e.message : "Terjadi kesalahan jaringan.",
      });
    } finally {
      setMenghapusId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Kelola{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Berita
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Cari dan hapus berita di database (maks. 300 baris terbaru).
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul berita."
            className="w-full rounded-xl border border-sky-100 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-sky-100 bg-white/80 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
        >
          {OPSI_STATUS.map((o) => (
            <option key={o.nilai} value={o.nilai}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {gagal ? (
        <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-8 text-center text-sm text-slate-600">
          Sesi admin berakhir atau kunci salah.
        </div>
      ) : data === null ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-sky-50" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-3xl border border-sky-100 bg-white/80 p-10 text-center text-sm text-slate-500">
          Tidak ada berita yang cocok.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {data.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm font-semibold text-slate-800 transition hover:text-sky-600"
                >
                  {b.judul}
                </a>
                <p className="mt-0.5 text-xs text-slate-400">
                  {b.sumber}
                  {b.kategori ? ` · ${b.kategori}` : ""} · {formatWaktuRelatif(b.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${WARNA_STATUS[b.status] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {b.status}
                  {typeof b.confidence === "number" ? ` · ${b.confidence}%` : ""}
                </span>
                <button
                  onClick={() => hapus(b.id)}
                  disabled={menghapusId === b.id}
                  title="Hapus berita"
                  className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  {menghapusId === b.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${
              toast.tipe === "sukses" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          >
            {toast.pesan}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}