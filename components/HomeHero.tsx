"use client";

import { motion } from "motion/react";
import { Activity, ShieldAlert, ShieldCheck, ShieldQuestion, Newspaper } from "lucide-react";
import StatsCard from "./StatsCard";
import { SUMBER_BERITA } from "@/lib/site";

const varianContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const varianItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

export default function HomeHero({
  total,
  hoax,
  fakta,
  mencurigakan,
}: {
  total: number;
  hoax: number;
  fakta: number;
  mencurigakan: number;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 pb-8">
      <motion.div
        variants={varianContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center gap-6 text-center"
      >
        <motion.span
          variants={varianItem}
          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="animate-soft-pulse relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          </span>
          AI aktif · memantau berita tiap 10 menit
        </motion.span>

        <motion.h1
          variants={varianItem}
          className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-800 sm:text-5xl"
        >
          Cek Berita{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Hoax
          </span>{" "}
          dengan AI
        </motion.h1>

        <motion.p variants={varianItem} className="max-w-2xl text-slate-600">
          Berita dari media Indonesia dianalisis otomatis oleh AI setiap 10 menit.
          Hasilnya langsung masuk database dan tampil di sini — lengkap dengan
          tingkat keyakinan dan alasan analisis.
        </motion.p>

        <motion.div
          variants={varianItem}
          className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <StatsCard label="Total Berita" nilai={total} ikon={Newspaper} warna="bg-gradient-to-br from-sky-400 to-blue-600" tunda={0.1} />
          <StatsCard label="Hoax" nilai={hoax} ikon={ShieldAlert} warna="bg-gradient-to-br from-rose-400 to-rose-500" tunda={0.2} />
          <StatsCard label="Fakta" nilai={fakta} ikon={ShieldCheck} warna="bg-gradient-to-br from-emerald-400 to-emerald-500" tunda={0.3} />
          <StatsCard label="Mencurigakan" nilai={mencurigakan} ikon={ShieldQuestion} warna="bg-gradient-to-br from-amber-400 to-amber-500" tunda={0.4} />
        </motion.div>

        <motion.div
          variants={varianItem}
          className="flex items-center gap-2 text-xs font-medium text-slate-500"
        >
          <Activity className="h-3.5 w-3.5 text-sky-500" />
          Sumber: {SUMBER_BERITA.map((s) => s.nama).join(" · ")}
        </motion.div>
      </motion.div>
    </section>
  );
}
