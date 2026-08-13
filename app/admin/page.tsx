"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { SUMBER_CEK_FAKTA } from "@/lib/site";
import InsightCard from "@/components/InsightCard";
import type { InsightTren } from "@/lib/insight";
import type { ProposalAi } from "@/lib/proposal";

const STATUS_FORM = [
  { nilai: "hoax", label: "Hoax" },
  { nilai: "fakta", label: "Fakta" },
  { nilai: "mencurigakan", label: "Mencurigakan" },
];

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
  dianalisis_at: string | null;
}

type TipeToast = "sukses" | "gagal";
type Toast = { tipe: TipeToast; pesan: string } | null;

export default function AdminPage() {
  const [kunci, setKunci] = useState("");
  const [judul, setJudul] = useState("");
  const [url, setUrl] = useState("");
  const [sumber, setSumber] = useState("");
  const [status, setStatus] = useState("mencurigakan");
  const [confidence, setConfidence] = useState("70");
  const [kategori, setKategori] = useState("");
  const [sumberCek, setSumberCek] = useState("");
  const [alasan, setAlasan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [insight, setInsight] = useState<InsightTren | null>(null);
  const [usulan, setUsulan] = useState<UsulanItem[] | null>(null);
  const [memprosesId, setMemprosesId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insight")
      .then((r) => r.json())
      .then((d) => setInsight(d.insight ?? null))
      .catch(() => setInsight(null));
  }, []);

  useEffect(() => {
    if (kunci.trim().length < 5) return;
    const timer = setTimeout(muatUsulan, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);

  async function muatUsulan() {
    try {
      const res = await fetch("/api/admin/usulan", {
        headers: { "x-admin-key": kunci },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { usulan?: UsulanItem[] };
      setUsulan(data.usulan ?? []);
    } catch {
      setUsulan([]);
    }
  }

  async function prosesUsulan(id: string, keputusan: "acc" | "tolak") {
    if (!kunci || !id || memprosesId) return;
    setMemprosesId(id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": kunci,
        },
        body: JSON.stringify({ id, keputusan }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        tampilkanToast("gagal", data.error ?? "Gagal memproses usulan.");
        return;
      }
      tampilkanToast(
        "sukses",
        keputusan === "acc"
          ? "Usulan disetujui — berita kini tampil di beranda."
          : "Usulan ditolak."
      );
      setUsulan((prev) => (prev ?? []).filter((u) => u.id !== id));
    } catch {
      tampilkanToast("gagal", "Terjadi kesalahan jaringan.");
    } finally {
      setMemprosesId(null);
    }
  }

  function tampilkanToast(tipe: TipeToast, pesan: string) {
    setToast({ tipe, pesan });
    setTimeout(() => setToast(null), 4000);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!kunci || !judul || memuat) return;

    setMemuat(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": kunci,
        },
        body: JSON.stringify({
          judul,
          url,
          sumber,
          status,
          confidence: Number(confidence),
          kategori,
          sumber_cek: sumberCek,
          alasan,
        }),
      });
      const data = (await res.json()) as { error?: string; hasil?: unknown };
      if (!res.ok) {
        tampilkanToast("gagal", data.error ?? "Gagal menyimpan.");
        return;
      }
      tampilkanToast("sukses", "Berita berhasil disimpan ke database.");
      setJudul("");
      setUrl("");
      setAlasan("");
    } catch {
      tampilkanToast("gagal", "Terjadi kesalahan jaringan.");
    } finally {
      setMemuat(false);
    }
  }

  const kelasInput =
    "w-full rounded-xl border border-sky-100 bg-sky-50/40 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
          <Lock className="h-4 w-4" />
          Area admin
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
          Input Berita{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Manual
          </span>
        </h1>
        <p className="mt-3 text-slate-600">
          Masukkan berita hoax/fakta temuanmu (mis. dari Turn Back Hoax atau Kominfo) langsung ke
          database tanpa menunggu cron.
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mt-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="relative">
              <Bell className="h-5 w-5 text-amber-500" />
              {usulan && usulan.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                  {usulan.length}
                </span>
              )}
            </span>
            Usulan AI — perlu persetujuan
          </h2>
          <button
            onClick={muatUsulan}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-300 hover:text-amber-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${usulan === null ? "animate-spin" : ""}`} />
            Muat ulang
          </button>
        </div>

        {!kunci ? (
          <p className="mt-3 text-sm text-slate-500">
            Masukkan kunci admin di form bawah untuk melihat notifikasi hasil analisis AI.
          </p>
        ) : usulan === null ? (
          <p className="mt-3 text-sm text-slate-500">Memuat usulan.</p>
        ) : usulan.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Belum ada usulan AI. Hasil analisis otomatis akan muncul di sini menunggu
            persetujuanmu.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {usulan.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${WARNA_USULAN[u.proposal.status_usulan] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {u.proposal.status_usulan}
                  </span>
                  <span className="text-xs text-slate-500">
                    Keyakinan {u.proposal.confidence}% · {u.sumber}
                    {u.proposal.kategori ? ` · ${u.proposal.kategori}` : ""}
                  </span>
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
                    onClick={() => prosesUsulan(u.id, "acc")}
                    disabled={memprosesId === u.id}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
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
      </motion.section>

      <motion.form
        onSubmit={simpan}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 space-y-4 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
      >
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <KeyRound className="h-4 w-4 text-sky-500" />
            Kunci admin
          </label>
          <input
            type="password"
            value={kunci}
            onChange={(e) => setKunci(e.target.value)}
            placeholder="ADMIN_KEY dari .env"
            className={kelasInput}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Judul berita <span className="text-rose-400">*</span>
          </label>
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: [HOAX] Vaksin mengandung chip pelacak"
            className={kelasInput}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            URL sumber (opsional)
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://turnbackhoax.id/…"
            className={kelasInput}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Sumber / media
            </label>
            <input
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              placeholder="Turn Back Hoax"
              className={kelasInput}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Kategori (opsional)
            </label>
            <input
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Kesehatan"
              className={kelasInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
            <div className="flex gap-2">
              {STATUS_FORM.map((s) => (
                <button
                  key={s.nilai}
                  type="button"
                  onClick={() => setStatus(s.nilai)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    status === s.nilai
                      ? "border-sky-400 bg-sky-500 text-white shadow-lg shadow-sky-200"
                      : "border-sky-100 bg-white text-slate-600 hover:bg-sky-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Keyakinan (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className={kelasInput}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Alasan / penjelasan (opsional)
          </label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={3}
            placeholder="Satu baris alasan tiap poin…"
            className={kelasInput}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Sumber rujukan (opsional)
          </label>
          <input
            value={sumberCek}
            onChange={(e) => setSumberCek(e.target.value)}
            placeholder="turnbackhoax.id"
            className={kelasInput}
          />
        </div>

        <button
          type="submit"
          disabled={memuat || !kunci || !judul}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50"
        >
          {memuat ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan…
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Simpan ke Database
            </>
          )}
        </button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-10"
      >
        <InsightCard insight={insight ?? { ringkasan: [] }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 rounded-3xl border border-sky-100 bg-white/60 p-5"
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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${
              toast.tipe === "sukses" ? "bg-emerald-500" : "bg-rose-500"
            }`}
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
