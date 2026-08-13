"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Newspaper,
  RefreshCw,
  ShieldX,
  XCircle,
} from "lucide-react";
import InsightCard from "@/components/InsightCard";
import { ambilKunciAdmin, hapusKunciAdmin, headerAdmin } from "@/lib/admin-key";
import type { InsightTren } from "@/lib/insight";
import type { ProposalAi } from "@/lib/proposal";
import { formatWaktuRelatif } from "@/lib/utils";

const KARTU_STAT = [
  { kunci: "total" as const, label: "Total Berita", icon: Newspaper, warna: "from-sky-400 to-blue-600" },
  { kunci: "hoax" as const, label: "Hoax", icon: ShieldX, warna: "from-rose-400 to-rose-600" },
  { kunci: "fakta" as const, label: "Fakta", icon: CheckCircle2, warna: "from-emerald-400 to-emerald-600" },
  { kunci: "mencurigakan" as const, label: "Mencurigakan", icon: AlertTriangle, warna: "from-amber-400 to-orange-500" },
  { kunci: "usulan" as const, label: "Usulan Menunggu", icon: FlaskConical, warna: "from-violet-400 to-purple-600" },
];

const WARNA_USULAN: Record<string, string> = {
  hoax: "bg-rose-100 text-rose-700",
  fakta: "bg-emerald-100 text-emerald-700",
  mencurigakan: "bg-amber-100 text-amber-700",
};

interface StatDashboard {
  count: {
    total: number;
    hoax: number;
    fakta: number;
    mencurigakan: number;
    pending: number;
    usulan: number;
  };
  terbaru: Array<{
    id: string;
    judul: string;
    url: string;
    sumber: string;
    status: string;
    confidence: number | null;
    kategori: string | null;
    created_at: string;
  }>;
  usulan: Array<{
    id: string;
    judul: string;
    url: string;
    sumber: string;
    proposal: ProposalAi;
    dianalisis_at: string;
  }>;
}

export default function DashboardAdmin() {
  const [data, setData] = useState<StatDashboard | null>(null);
  const [gagal, setGagal] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [memprosesId, setMemprosesId] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightTren | null>(null);
  const [notif, setNotif] = useState<string | null>(null);

  async function muat() {
    const k = ambilKunciAdmin();
    if (!k) {
      setGagal(true);
      setMemuat(false);
      return;
    }
    try {
      const [resStats, resInsight] = await Promise.all([
        fetch("/api/admin/stats", { headers: headerAdmin(k) }),
        fetch("/api/insight"),
      ]);
      if (!resStats.ok) {
        hapusKunciAdmin();
        setGagal(true);
        return;
      }
      setData((await resStats.json()) as StatDashboard);
      const di = (await resInsight.json()) as { insight?: InsightTren | null };
      setInsight(di.insight ?? null);
    } catch {
      setGagal(true);
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    muat();
  }, []);

  async function prosesUsulan(id: string, keputusan: "acc" | "tolak") {
    if (memprosesId) return;
    setMemprosesId(id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerAdmin(ambilKunciAdmin()) },
        body: JSON.stringify({ id, keputusan }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Gagal");
      setData((prev) =>
        prev
          ? {
              ...prev,
              count: { ...prev.count, usulan: Math.max(0, prev.count.usulan - 1) },
              usulan: prev.usulan.filter((u) => u.id !== id),
            }
          : prev
      );
      setNotif(keputusan === "acc" ? "Usulan disetujui." : "Usulan ditolak.");
      setTimeout(() => setNotif(null), 3000);
    } catch (e) {
      setNotif(e instanceof Error ? e.message : "Gagal memproses usulan.");
      setTimeout(() => setNotif(null), 4000);
    } finally {
      setMemprosesId(null);
    }
  }

  if (memuat) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-sky-50" />
        ))}
      </div>
    );
  }

  if (gagal || !data) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-8 text-center">
        <p className="font-semibold text-slate-700">
          Sesi admin berakhir — kunci salah atau tidak tersedia.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Masuk kembali melalui gerbang dashboard.
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white"
        >
          Kembali ke Gerbang
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
            Dashboard{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Admin
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan berita terverifikasi, usulan AI, dan tren hoax.
          </p>
        </div>
        <button
          onClick={muat}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Muat ulang
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {KARTU_STAT.map((kartu) => {
          const Icon = kartu.icon;
          return (
            <div
              key={kartu.kunci}
              className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-sm"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kartu.warna} text-white shadow-md`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-2xl font-extrabold text-slate-800">
                {data.count[kartu.kunci].toLocaleString("id-ID")}
              </p>
              <p className="text-xs font-medium text-slate-500">{kartu.label}</p>
            </div>
          );
        })}
      </div>

      <InsightCard insight={insight ?? { ringkasan: [] }} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-800">
              <FlaskConical className="h-4 w-4 text-amber-500" />
              Usulan AI terbaru
            </h2>
            <Link
              href="/admin/usulan"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Kelola semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.usulan.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada usulan AI.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.usulan.map((u) => (
                <li key={u.id} className="rounded-2xl border border-amber-100 bg-white p-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${WARNA_USULAN[u.proposal.status_usulan] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {u.proposal.status_usulan}
                    </span>
                    <span>Keyakinan {u.proposal.confidence}% · {u.sumber}</span>
                  </div>
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-800 hover:text-sky-600"
                  >
                    {u.judul}
                  </a>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => prosesUsulan(u.id, "acc")}
                      disabled={memprosesId === u.id}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {memprosesId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Setujui
                    </button>
                    <button
                      onClick={() => prosesUsulan(u.id, "tolak")}
                      disabled={memprosesId === u.id}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tolak
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Berita terverifikasi terbaru</h2>
            <Link
              href="/admin/berita"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Kelola semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.terbaru.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada berita terverifikasi.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sky-50">
              {data.terbaru.map((b) => (
                <li key={b.id} className="py-2.5">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-sky-600"
                  >
                    {b.judul}
                  </a>
                  <p className="mt-0.5 text-xs text-slate-400">
                    <span className="font-semibold text-slate-500">{b.sumber}</span> ·{" "}
                    {formatWaktuRelatif(b.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-xl"
          >
            {notif}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}