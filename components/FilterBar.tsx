"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import NewsCard from "./NewsCard";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";
import type { Berita, StatusBerita } from "@/lib/types";

const PILIHAN_STATUS: Array<{ nilai: "semua" | "hoax" | "fakta" | "mencurigakan"; label: string }> = [
  { nilai: "semua", label: "Semua" },
  { nilai: "hoax", label: "Hoax" },
  { nilai: "fakta", label: "Fakta" },
  { nilai: "mencurigakan", label: "Mencurigakan" },
];

const OPSI_SORT = [
  { nilai: "terbaru", label: "Terbaru" },
  { nilai: "keyakinan", label: "Keyakinan AI tertinggi" },
  { nilai: "judul", label: "Judul A–Z" },
];

export interface FilterAwal {
  q?: string;
  status?: string;
  kategori?: string;
  sumber?: string;
}

export default function FilterBar({
  items,
  awal,
}: {
  items: Berita[];
  awal?: FilterAwal;
}) {
  const [q, setQ] = useState(awal?.q ?? "");
  const [status, setStatus] = useState<StatusBerita | "semua">(
    (awal?.status as StatusBerita) || "semua"
  );
  const [kategori, setKategori] = useState(awal?.kategori ?? "semua");
  const [sumber, setSumber] = useState(awal?.sumber ?? "semua");
  const [sort, setSort] = useState("terbaru");
  const [kataAi, setKataAi] = useState<string[] | null>(null);
  const [aiUntukQ, setAiUntukQ] = useState<string | null>(null);
  const [mencariAi, setMencariAi] = useState(false);
  const [aiCatatan, setAiCatatan] = useState<string | null>(null);

  async function cariDenganAi() {
    if (!q.trim() || mencariAi) return;
    setMencariAi(true);
    setAiCatatan(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: q.trim() }),
      });
      const data = (await res.json()) as {
        kataKunci?: string[];
        status?: string | null;
        kategori?: string | null;
        offline?: boolean;
        error?: string;
      };
      if (!res.ok || !data.kataKunci?.length) {
        setAiCatatan(data.error ?? "Gagal memproses pencarian.");
        return;
      }
      setKataAi(data.kataKunci);
      setAiUntukQ(q.trim());
      if (data.status) setStatus(data.status as StatusBerita);
      if (data.kategori) setKategori(data.kategori);
      if (data.offline) setAiCatatan("Kuota AI habis — memakai pencarian biasa.");
    } catch {
      setAiCatatan("Terjadi kesalahan jaringan.");
    } finally {
      setMencariAi(false);
    }
  }

  const pilihanKategori = useMemo(() => {
    const set = new Set<string>();
    items.forEach((b) => b.kategori && set.add(b.kategori));
    return [...set].sort();
  }, [items]);

  const pilihanSumber = useMemo(() => {
    const set = new Set<string>();
    items.forEach((b) => b.sumber && set.add(b.sumber));
    return [...set].sort();
  }, [items]);

  const hasil = useMemo(() => {
    const kata = q.trim().toLowerCase();
    const kataDipakai =
      kataAi && kataAi.length > 0 ? kataAi : kata ? [kata] : [];
    let daftar = items.filter((b) => {
      if (status !== "semua" && b.status !== status) return false;
      if (kategori !== "semua" && b.kategori !== kategori) return false;
      if (sumber !== "semua" && b.sumber !== sumber) return false;
      if (kataDipakai.length) {
        const cocok = kataDipakai.some(
          (k) =>
            b.judul.toLowerCase().includes(k) ||
            (b.ringkasan ?? "").toLowerCase().includes(k) ||
            b.url.toLowerCase().includes(k)
        );
        if (!cocok) return false;
      }
      return true;
    });
    if (sort === "keyakinan") {
      daftar = [...daftar].sort(
        (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
      );
    } else if (sort === "judul") {
      daftar = [...daftar].sort((a, b) => a.judul.localeCompare(b.judul, "id"));
    } else {
      daftar = [...daftar].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      );
    }
    return daftar;
  }, [items, q, status, kategori, sumber, sort, kataAi]);

  const chipClass = (aktif: boolean) =>
    cn(
      "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
      aktif
        ? "bg-sky-500 text-white shadow-lg shadow-sky-200"
        : "bg-white/80 text-slate-600 hover:bg-sky-50 hover:text-sky-600"
    );

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="rounded-3xl border border-sky-100 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (aiUntukQ && e.target.value !== aiUntukQ) {
                    setKataAi(null);
                    setAiUntukQ(null);
                    setAiCatatan(null);
                  }
                }}
                placeholder="Cari judul, ringkasan, atau URL berita…"
                className="w-full rounded-full border border-sky-100 bg-sky-50/50 py-2.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <button
              onClick={cariDenganAi}
              disabled={!q.trim() || mencariAi}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50"
            >
              {mencariAi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Cari dengan AI</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="rounded-full border border-sky-100 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-sky-300"
            >
              <option value="semua">Semua kategori</option>
              {pilihanKategori.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <select
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              className="rounded-full border border-sky-100 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-sky-300"
            >
              <option value="semua">Semua sumber</option>
              {pilihanSumber.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-full border border-sky-100 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-sky-300"
            >
              {OPSI_SORT.map((o) => (
                <option key={o.nilai} value={o.nilai}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {kataAi && (
            <div className="mb-1 flex w-full flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Sparkles className="h-3 w-3" />
                Pencarian AI: {kataAi.join(" · ")}
                <button
                  onClick={() => {
                    setKataAi(null);
                    setAiUntukQ(null);
                    setAiCatatan(null);
                  }}
                  className="ml-1 rounded-full px-1 text-sky-400 transition hover:text-sky-600"
                  aria-label="Hapus pencarian AI"
                >
                  ✕
                </button>
              </span>
              {aiCatatan && <span className="text-xs text-slate-400">{aiCatatan}</span>}
            </div>
          )}
          <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Status
          </span>
          {PILIHAN_STATUS.map((p) => (
            <button
              key={p.nilai}
              onClick={() => setStatus(p.nilai)}
              className={chipClass(status === p.nilai)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span>
          Menampilkan <b className="text-slate-700">{hasil.length}</b> dari{" "}
          <b className="text-slate-700">{items.length}</b> berita
        </span>
      </div>

      {hasil.length === 0 ? (
        <EmptyState mode={items.length === 0 ? "kosong" : "filter"} />
      ) : (
        <motion.ul
          layout
          className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {hasil.map((b) => (
              <NewsCard key={b.id} berita={b} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </section>
  );
}
