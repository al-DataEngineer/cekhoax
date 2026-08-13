"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowUpRight, ExternalLink, Loader2, ScanSearch } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import { SUMBER_CEK_FAKTA } from "@/lib/site";
import { ambilDomain, bacaAlasan } from "@/lib/utils";
import type { Berita } from "@/lib/types";

export default function CekBeritaPage() {
  const [q, setQ] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Berita | null>(null);
  const [dari, setDari] = useState<string | null>(null);

  async function cek(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query || memuat) return;

    setMemuat(true);
    setError(null);
    setHasil(null);
    try {
      const res = await fetch("/api/cek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = (await res.json()) as {
        hasil?: Berita | null;
        dari?: string;
        error?: string;
      };
      if (!res.ok || !data.hasil) {
        setError(data.error ?? "Gagal memeriksa berita.");
        return;
      }
      setHasil(data.hasil);
      setDari(data.dari ?? null);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  const alasan = hasil ? bacaAlasan(hasil.alasan) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
          <ScanSearch className="h-4 w-4" />
          Cek cepat — 1 berita
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
          Cek Berita{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Hoax
          </span>
        </h1>
        <p className="mt-3 text-slate-600">
          Tempel URL artikel atau tulis judul berita. Sistem akan mencocokkan dengan database,
          atau langsung menganalisis lewat AI.
        </p>
      </motion.div>

      <motion.form
        onSubmit={cek}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="https://… atau judul berita…"
          className="flex-1 rounded-2xl border border-sky-100 bg-white px-5 py-3.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="submit"
          disabled={memuat || !q.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50"
        >
          {memuat ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menganalisis…
            </>
          ) : (
            <>
              <ScanSearch className="h-4 w-4" />
              Cek Sekarang
            </>
          )}
        </button>
      </motion.form>

      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </motion.div>
        )}

        {hasil && (
          <motion.div
            key="hasil"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-sm backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-sky-50 p-5">
              <StatusBadge status={hasil.status} />
              {dari && (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
                  {dari === "database" ? "Dari database" : "Hasil analisis AI"}
                </span>
              )}
            </div>

            <div className="p-5">
              <h2 className="text-lg font-bold leading-snug text-slate-800">
                {hasil.judul}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-600">
                  {hasil.sumber}
                </span>
                {hasil.kategori && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{hasil.kategori}</span>
                )}
                {hasil.url.startsWith("http") && (
                  <a
                    href={hasil.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 transition hover:bg-sky-100 hover:text-sky-700"
                  >
                    {ambilDomain(hasil.url)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {hasil.ringkasan && (
                <p className="mt-4 rounded-2xl bg-sky-50/60 p-4 text-sm text-slate-600">
                  {hasil.ringkasan}
                </p>
              )}

              <div className="mt-6 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-5">
                <ConfidenceBar confidence={hasil.confidence} status={hasil.status} besar />
              </div>

              {alasan.length > 0 && (
                <ul className="mt-5 space-y-2.5">
                  {alasan.map((a, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}

              <a
                href={`/berita/${hasil.id}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
              >
                Lihat halaman detail
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 rounded-3xl border border-sky-100 bg-white/60 p-5"
      >
        <h3 className="text-sm font-bold text-slate-700">Sumber rujukan cek fakta</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUMBER_CEK_FAKTA.map((s) => (
            <a
              key={s.nama}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
            >
              {s.nama}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
