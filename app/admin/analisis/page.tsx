"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BrainCircuit,
  CheckCheck,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { headerAdmin } from "@/lib/admin-key";
import { cn } from "@/lib/utils";

interface SumberAnalisis {
  nama: string;
  jumlah: number;
  aktif: boolean;
}

interface ResponAnalisis {
  konfig: { auto: boolean; sumber: string[] };
  daftar: SumberAnalisis[];
  totalAntrean: number;
}

export default function AnalisisAiPage() {
  const [data, setData] = useState<ResponAnalisis | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menjalankan, setMenjalankan] = useState(false);
  const [toast, setToast] = useState<{ tipe: "sukses" | "gagal"; pesan: string } | null>(null);

  async function muat(simpan = false, body?: unknown, jalankan = false) {
    if (menyimpan || menjalankan) return;
    if (jalankan) setMenjalankan(true);
    else if (simpan) setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/analisis", {
        method: simpan || jalankan ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...headerAdmin(),
        },
        body: simpan || jalankan ? JSON.stringify(body) : undefined,
      });
      const j = (await res.json()) as ResponAnalisis & { error?: string; laporan?: { dianalisis: number; gagal: number } };
      if (!res.ok) {
        setGagal(true);
        return;
      }
      setData({
        konfig: j.konfig,
        daftar: j.daftar,
        totalAntrean: j.totalAntrean,
      });
      setGagal(false);
      if (simpan && !jalankan) {
        setToast({ tipe: "sukses", pesan: "Pengaturan analisis disimpan." });
        setTimeout(() => setToast(null), 3000);
      }
      if (jalankan) {
        setToast({
          tipe: "sukses",
          pesan: `${j.laporan?.dianalisis ?? 0} dianalisis jadi usulan, ${j.laporan?.gagal ?? 0} gagal.`,
        });
        setTimeout(() => setToast(null), 5000);
      }
    } catch {
      setToast({
        tipe: "gagal",
        pesan: jalankan ? "Jalankan gagal — coba lagi." : "Gagal memuat data.",
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setMenjalankan(false);
      setMenyimpan(false);
      setMemuat(false);
    }
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const semuaAktif = data
    ? data.daftar.every((s) => s.aktif)
    : false;

  async function ubahAuto(nilai: boolean) {
    if (!data) return;
    await muat(true, { auto: nilai, sumber: data.konfig.sumber });
  }

  async function ubahSumber(nama: string, nilai: boolean) {
    if (!data) return;
    const lama = data.konfig.sumber;
    let baru: string[];
    if (lama.length === 0) {
      const semua = data.daftar.map((s) => s.nama);
      baru = nilai ? semua : semua.filter((s) => s !== nama);
    } else if (nilai) {
      baru = [...lama, nama];
      if (baru.length === data.daftar.length) baru = [];
    } else {
      baru = lama.filter((s) => s !== nama);
      if (baru.length === data.daftar.length) baru = [];
    }
    await muat(true, { auto: data.konfig.auto, sumber: baru });
  }

  async function ceklisSemua() {
    if (!data) return;
    await muat(true, { auto: data.konfig.auto, sumber: [] });
  }

  if (memuat) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-3xl bg-violet-50" />
        ))}
      </div>
    );
  }

  if (gagal || !data) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-8 text-center text-sm text-slate-600">
        Sesi admin berakhir atau kunci salah.
        <button
          onClick={() => {
            setMemuat(true);
            muat();
          }}
          className="ml-2 inline-flex items-center gap-1 font-semibold text-rose-600"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
        </button>
      </div>
    );
  }

  const jumlahDipilih = data.daftar.filter((s) => s.aktif).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Analisis{" "}
          <span className="bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Atur jalannya analisis otomatis dan jalankan analisis manual kapan pun.
        </p>
      </header>

      <section className="rounded-3xl border border-violet-100 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-md">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-800">Analisis otomatis (cron)</h2>
              <p className="text-xs text-slate-500">
                Saat nyala, cron tiap 10 menit menganalisis berita baru dari sumber aktif dan
                menyimpannya sebagai usulan.
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={data.konfig.auto}
            onClick={() => ubahAuto(!data.konfig.auto)}
            disabled={menyimpan}
            className={cn(
              "relative h-8 w-14 rounded-full transition-colors disabled:opacity-50",
              data.konfig.auto ? "bg-emerald-500" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
                data.konfig.auto ? "left-7" : "left-1"
              )}
            />
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800">Sumber yang dianalisis</h2>
            <p className="text-xs text-slate-500">
              {jumlahDipilih} dari {data.daftar.length} sumber aktif · {data.totalAntrean} berita
              mengantre menunggu analisis.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={ceklisSemua}
              disabled={menyimpan || semuaAktif}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-600 transition hover:bg-violet-100 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {semuaAktif ? "Semua aktif" : "Ceklis semua"}
            </button>
            <button
              onClick={() => {
                setMemuat(true);
                muat();
              }}
              disabled={menyimpan}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Muat ulang
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.daftar.map((s) => (
            <div
              key={s.nama}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition",
                s.aktif
                  ? "border-violet-200 bg-violet-50/60"
                  : "border-slate-100 bg-white"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{s.nama}</p>
                <p className="text-[11px] text-slate-400">
                  {s.jumlah > 0 ? `${s.jumlah} berita antre` : "tidak ada antrean"}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={s.aktif}
                onClick={() => ubahSumber(s.nama, !s.aktif)}
                disabled={menyimpan}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                  s.aktif ? "bg-emerald-500" : "bg-slate-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    s.aktif ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800">Jalankan sekarang</h2>
            <p className="text-xs text-slate-500">
              Analisis langsung maks. 10 berita dari sumber aktif (tanpa menunggu cron). Hasilnya
              jadi usulan yang menunggu persetujuanmu.
            </p>
          </div>
          <button
            onClick={() => muat(true, { auto: data.konfig.auto, sumber: data.konfig.sumber }, true)}
            disabled={menjalankan || data.totalAntrean === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
          >
            {menjalankan ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menganalisis.
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Jalankan AI Sekarang
              </>
            )}
          </button>
        </div>
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl",
              toast.tipe === "sukses" ? "bg-emerald-500" : "bg-rose-500"
            )}
          >
            {toast.tipe === "sukses" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {toast.pesan}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}