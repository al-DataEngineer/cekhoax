"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { headerAdmin } from "@/lib/admin-key";
import type { ProposalAi } from "@/lib/proposal";
import { formatWaktuRelatif } from "@/lib/utils";

const WARNA_USULAN: Record<string, string> = {
  hoax: "bg-rose-100 text-rose-700",
  fakta: "bg-emerald-100 text-emerald-700",
  mencurigakan: "bg-amber-100 text-amber-700",
};

interface UsulanItem {
  id: string;
  judul: string;
  url: string;
  sumber: string;
  gambar: string | null;
  proposal: ProposalAi;
  dianalisis_at: string;
}

export default function KelolaUsulanPage() {
  const [usulan, setUsulan] = useState<UsulanItem[] | null>(null);
  const [memprosesId, setMemprosesId] = useState<string | null>(null);
  const [gagal, setGagal] = useState(false);
  const [toast, setToast] = useState<{ tipe: "sukses" | "gagal"; pesan: string } | null>(null);

  async function muat() {
    try {
      const res = await fetch("/api/admin/usulan", {
        headers: headerAdmin(sessionStorage.getItem("ckh_admin_key") ?? ""),
      });
      if (!res.ok) {
        setGagal(true);
        return;
      }
      const d = (await res.json()) as { usulan?: UsulanItem[] };
      setUsulan(d.usulan ?? []);
      setGagal(false);
    } catch {
      setGagal(true);
    }
  }

  useEffect(() => {
    muat();
  }, []);

  function tampilkanToast(tipe: "sukses" | "gagal", pesan: string) {
    setToast({ tipe, pesan });
    setTimeout(() => setToast(null), 4000);
  }

  async function proses(id: string, keputusan: "acc" | "tolak") {
    if (memprosesId) return;
    setMemprosesId(id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headerAdmin(sessionStorage.getItem("ckh_admin_key") ?? ""),
        },
        body: JSON.stringify({ id, keputusan }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        tampilkanToast("gagal", d.error ?? "Gagal memproses usulan.");
        return;
      }
      tampilkanToast(
        "sukses",
        keputusan === "acc"
          ? "Usulan disetujui — berita kini tampil di situs customer."
          : "Usulan ditolak."
      );
      setUsulan((prev) => (prev ?? []).filter((u) => u.id !== id));
    } catch {
      tampilkanToast("gagal", "Terjadi kesalahan jaringan.");
    } finally {
      setMemprosesId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
            Usulan{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hasil analisis otomatis yang menunggu persetujuan sebelum tampil di situs customer.
          </p>
        </div>
        <button
          onClick={muat}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${usulan === null ? "animate-spin" : ""}`} />
          Muat ulang
        </button>
      </header>

      {gagal ? (
        <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-8 text-center text-sm text-slate-600">
          Sesi admin berakhir atau kunci salah.
        </div>
      ) : usulan === null ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-amber-50" />
          ))}
        </div>
      ) : usulan.length === 0 ? (
        <div className="rounded-3xl border border-sky-100 bg-white/80 p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-sky-300" />
          <p className="mt-3 font-semibold text-slate-700">Tidak ada usulan menunggu</p>
          <p className="mt-1 text-sm text-slate-500">
            Hasil analisis AI berikutnya akan muncul di sini secara otomatis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {usulan.map((u) => (
            <div
              key={u.id}
              className="rounded-3xl border border-amber-100 bg-white/80 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${WARNA_USULAN[u.proposal.status_usulan] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {u.proposal.status_usulan}
                </span>
                <span>Keyakinan {u.proposal.confidence}% · {u.sumber}</span>
                <span>
                  {u.proposal.kategori ? ` · ${u.proposal.kategori}` : ""}
                </span>
                <span className="ml-auto">Analisis {formatWaktuRelatif(u.dianalisis_at)}</span>
              </div>
              <a
                href={u.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 line-clamp-2 font-semibold text-slate-800 transition hover:text-sky-600"
              >
                {u.judul}
              </a>
              {u.proposal.alasan.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {u.proposal.alasan.map((a, i) => (
                    <li key={i} className="text-[13px] leading-relaxed text-slate-600">
                      <span className="mr-1.5 text-amber-500">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => proses(u.id, "acc")}
                  disabled={memprosesId === u.id}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {memprosesId === u.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Setujui & Publikasikan
                </button>
                <button
                  onClick={() => proses(u.id, "tolak")}
                  disabled={memprosesId === u.id}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
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
            {toast.tipe === "sukses" ? (
              <CheckCircle2 className="mr-1.5 inline h-5 w-5" />
            ) : (
              <XCircle className="mr-1.5 inline h-5 w-5" />
            )}
            {toast.pesan}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}