"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, FolderSearch, Loader2, XCircle } from "lucide-react";
import { headerAdmin } from "@/lib/admin-key";
import { cn } from "@/lib/utils";

interface SelesaiRun {
  ok: boolean;
  pesan: string;
}

interface LaporanMode {
  dianalisis?: number;
  gagal?: number;
  diperiksa?: number;
  rusak?: number;
  kelompok?: number;
  belumLengkap?: number;
}

type LaporanAnalisis = Record<string, LaporanMode>;

/** Menjalankan "Jalankan sekarang" dari tingkat layout sehingga tetap berjalan
 * saat admin berpindah-pindah menu (fetch tidak dicopot bersama halaman). */
export default function PemantauAnalisis() {
  const [aktif, setAktif] = useState(false);
  const [selesai, setSelesai] = useState<SelesaiRun | null>(null);
  const sibuk = useRef(false);

  const ringkasLaporan = useCallback((l: LaporanAnalisis) => {
    const ringkas: string[] = [];
    if (l.pending) ringkas.push(`Pending: ${l.pending.dianalisis ?? 0} jadi usulan, ${l.pending.gagal ?? 0} gagal`);
    if (l.mencurigakan) ringkas.push(`Telaah ulang: ${l.mencurigakan.dianalisis ?? 0} jadi usulan, ${l.mencurigakan.gagal ?? 0} gagal`);
    if (l.tautan) ringkas.push(`Tautan: ${l.tautan.rusak ?? 0} dari ${l.tautan.diperiksa ?? 0} rusak`);
    if (l.duplikat) ringkas.push(`Duplikat: ${l.duplikat.kelompok ?? 0} kemungkinan`);
    if (l.kelengkapan) ringkas.push(`Data: ${l.kelengkapan.belumLengkap ?? 0} belum lengkap`);
    return ringkas.length ? ringkas.join(" · ") : "Tidak ada pemeriksaan yang dicentang.";
  }, []);

  useEffect(() => {
    const jalankan = async (e: Event) => {
      if (sibuk.current) return;
      sibuk.current = true;
      setAktif(true);
      setSelesai(null);
      window.dispatchEvent(new Event("cek:mulai"));
      try {
        const detail = (e as CustomEvent<{ body?: object }>).detail;
        const res = await fetch("/api/admin/analisis", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headerAdmin() },
          body: JSON.stringify({ jalankan: true, ...(detail?.body ?? {}) }),
        });
        const j = (await res.json()) as { error?: string; laporan?: LaporanAnalisis };
        if (!res.ok) throw new Error(j.error ?? "Server menolak permintaan.");
        setSelesai({ ok: true, pesan: ringkasLaporan(j.laporan ?? {}) });
      } catch (err) {
        setSelesai({ ok: false, pesan: err instanceof Error ? err.message : "Pemeriksaan gagal — coba lagi." });
      } finally {
        sibuk.current = false;
        setAktif(false);
        window.dispatchEvent(new Event("cek:selesai"));
      }
    };

    const handler = (e: Event) => {
      void jalankan(e);
    };
    window.addEventListener("cek:jalankan", handler);
    return () => window.removeEventListener("cek:jalankan", handler);
  }, [ringkasLaporan]);

  useEffect(() => {
    if (!selesai) return;
    const t = setTimeout(() => setSelesai(null), 8000);
    return () => clearTimeout(t);
  }, [selesai]);

  return (
    <AnimatePresence>
      {(aktif || selesai) && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={cn(
            "fixed bottom-6 left-1/2 z-[60] flex w-[min(92vw,540px)] -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl ring-1",
            aktif
              ? "bg-white text-slate-800 ring-violet-200"
              : selesai?.ok
                ? "bg-emerald-500 text-white ring-emerald-600"
                : "bg-rose-500 text-white ring-rose-600"
          )}
        >
          {aktif ? (
            <>
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-violet-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Sedang memeriksa…</p>
                <p className="text-[11px] text-slate-500">
                  Pemeriksaan tetap berjalan walau kamu pindah menu. Hasil akan muncul di sini saat selesai.
                </p>
              </div>
            </>
          ) : selesai ? (
            <>
              {selesai.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0" />
              )}
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{selesai.pesan}</p>
              <FolderSearch className="h-4 w-4 shrink-0 opacity-70" />
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}