"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Send, Sparkles, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pesan {
  role: "user" | "assistant";
  content: string;
}

interface KonteksDibuka {
  beritaId?: string;
  judul?: string;
}

const SARAN = [
  "Berita hoax apa yang terbaru?",
  "Ciri-ciri berita palsu apa saja?",
  "Berita apa saja yang dikategorikan fakta hari ini?",
];

export function bukaAsisten(konteks?: KonteksDibuka) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cekhoax:chat", { detail: konteks ?? {} }));
}

export default function ChatWidget() {
  const [terbuka, setTerbuka] = useState(false);
  const [pesan, setPesan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [riwayat, setRiwayat] = useState<Pesan[]>([]);
  const [konteks, setKonteks] = useState<KonteksDibuka | null>(null);
  const [kataDitutup, setKataDitutup] = useState(true);

  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function buka(e: Event) {
      const detail = (e as CustomEvent<KonteksDibuka>).detail ?? {};
      setKonteks(detail.beritaId || detail.judul ? detail : null);
      setTerbuka(true);
      setKataDitutup(false);
    }
    window.addEventListener("cekhoax:chat", buka);
    return () => window.removeEventListener("cekhoax:chat", buka);
  }, []);

  useEffect(() => {
    if (areaRef.current) {
      areaRef.current.scrollTop = areaRef.current.scrollHeight;
    }
  }, [riwayat, memuat, terbuka]);

  async function kirim(teks?: string) {
    const isi = (teks ?? pesan).trim();
    if (!isi || memuat) return;

    const riwayatBaru: Pesan[] = [...riwayat, { role: "user", content: isi }];
    setRiwayat(riwayatBaru);
    setPesan("");
    setMemuat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pesan: isi,
          beritaId: konteks?.beritaId,
          riwayat: riwayat.filter((p) => p.role === "user" || p.role === "assistant").slice(-10),
        }),
      });
      const data = (await res.json()) as { jawaban?: string; error?: string };
      if (!res.ok || !data.jawaban) {
        setRiwayat([...riwayatBaru, { role: "assistant", content: data.error ?? "Terjadi kesalahan, coba lagi." }]);
        return;
      }
      setRiwayat([...riwayatBaru, { role: "assistant", content: data.jawaban }]);
    } catch {
      setRiwayat([...riwayatBaru, { role: "assistant", content: "Terjadi kesalahan jaringan, coba lagi." }]);
    } finally {
      setMemuat(false);
    }
  }

  const bukaPertama = !kataDitutup && !terbuka;

  return (
    <>
      <AnimatePresence>
        {terbuka && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-4 z-50 flex w-[min(92vw,400px)] flex-col overflow-hidden rounded-3xl border border-sky-200/70 bg-white/95 shadow-2xl shadow-sky-200/60 backdrop-blur-xl sm:right-6"
          >
            <div className="flex items-center gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Asisten AI CekHoax</p>
                <p className="text-[11px] text-sky-100">
                  Tanya apa saja soal berita & hoax
                </p>
              </div>
              <button
                onClick={() => setTerbuka(false)}
                className="rounded-full p-1.5 text-sky-100 transition hover:bg-white/15 hover:text-white"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {konteks?.judul && (
              <div className="flex items-center gap-2 border-b border-sky-50 bg-sky-50/60 px-4 py-2.5">
                <Bot className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                <p className="line-clamp-1 flex-1 text-xs text-slate-600">
                  {konteks.judul}
                </p>
                <button
                  onClick={() => setKonteks(null)}
                  className="rounded-full p-1 text-slate-400 transition hover:text-slate-600"
                  aria-label="Hapus konteks"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div ref={areaRef} className="flex h-[min(50vh,380px)] flex-col gap-3 overflow-y-auto px-4 py-4">
              {riwayat.length === 0 && (
                <div className="space-y-2">
                  <p className="rounded-2xl rounded-tl-sm border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-600">
                    Halo! Saya bisa bantu cek berita: ketik URL/klaim, tanya tren hoax,
                    atau minta penjelasan berita apa pun yang ada di CekHoax. ✨
                  </p>
                  {SARAN.map((s) => (
                    <button
                      key={s}
                      onClick={() => kirim(s)}
                      disabled={memuat}
                      className="block w-full rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-left text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {riwayat.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    p.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {p.role === "assistant" && (
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <p
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      p.role === "user"
                        ? "rounded-tr-sm bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                        : "rounded-tl-sm border border-sky-100 bg-sky-50/70 text-slate-700"
                    )}
                  >
                    {p.content}
                  </p>
                  {p.role === "user" && (
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500">
                      <User className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              ))}

              {memuat && (
                <div className="flex gap-2">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-sky-100 bg-sky-50/70 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="h-1.5 w-1.5 rounded-full bg-sky-400"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-sky-100 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  kirim();
                }}
                className="flex gap-2"
              >
                <input
                  value={pesan}
                  onChange={(e) => setPesan(e.target.value)}
                  placeholder="Tulis pertanyaan…"
                  className="min-w-0 flex-1 rounded-full border border-sky-100 bg-sky-50/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={!pesan.trim() || memuat}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-40"
                  aria-label="Kirim"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setTerbuka((t) => !t)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-300/50 transition sm:right-6"
        aria-label="Buka Asisten AI"
      >
        <Sparkles className="h-5 w-5" />
        {bukaPertama && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden sm:inline"
          >
            Tanya AI
          </motion.span>
        )}
      </motion.button>
    </>
  );
}