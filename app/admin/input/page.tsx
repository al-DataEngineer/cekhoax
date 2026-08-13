"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { SUMBER_CEK_FAKTA } from "@/lib/site";
import { headerAdmin } from "@/lib/admin-key";

const STATUS_FORM = [
  { nilai: "hoax", label: "Hoax" },
  { nilai: "fakta", label: "Fakta" },
  { nilai: "mencurigakan", label: "Mencurigakan" },
];

export default function InputManualPage() {
  const [judul, setJudul] = useState("");
  const [url, setUrl] = useState("");
  const [sumber, setSumber] = useState("");
  const [status, setStatus] = useState("mencurigakan");
  const [confidence, setConfidence] = useState("70");
  const [kategori, setKategori] = useState("");
  const [sumberCek, setSumberCek] = useState("");
  const [alasan, setAlasan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [toast, setToast] = useState<{ tipe: "sukses" | "gagal"; pesan: string } | null>(null);

  function tampilkanToast(tipe: "sukses" | "gagal", pesan: string) {
    setToast({ tipe, pesan });
    setTimeout(() => setToast(null), 4000);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!judul || memuat) return;

    setMemuat(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headerAdmin(),
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
      const data = (await res.json()) as { error?: string };
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Input Berita{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Manual
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan berita hoax/fakta temuanmu (mis. dari Turn Back Hoax atau Kominfo) langsung ke
          database tanpa menunggu cron.
        </p>
      </header>

      <form
        onSubmit={simpan}
        className="space-y-4 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
      >
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
            placeholder="https://turnbackhoax.id/."
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
            placeholder="Satu baris alasan tiap poin."
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
          disabled={memuat || !judul}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50"
        >
          {memuat ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan.
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Simpan ke Database
            </>
          )}
        </button>
      </form>

      <div className="rounded-3xl border border-sky-100 bg-white/60 p-5">
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
      </div>

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