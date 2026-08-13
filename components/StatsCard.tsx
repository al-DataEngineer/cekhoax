"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "motion/react";
import type { LucideIcon } from "lucide-react";

function useCountUp(nilai: number, mulai: boolean) {
  const [tampil, setTampil] = useState(0);
  useEffect(() => {
    if (!mulai) return;
    const kontrol = animate(0, nilai, {
      duration: 1.3,
      ease: "easeOut",
      onUpdate: (v) => setTampil(Math.round(v)),
    });
    return () => kontrol.stop();
  }, [nilai, mulai]);
  return tampil;
}

export default function StatsCard({
  label,
  nilai,
  ikon: Ikon,
  warna,
  tunda = 0,
}: {
  label: string;
  nilai: number;
  ikon: LucideIcon;
  warna: string;
  tunda?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const diLayar = useInView(ref, { once: true, margin: "-40px" });
  const angka = useCountUp(nilai, diLayar);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: tunda, ease: "easeOut" }}
      className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${warna}`}
        >
          <Ikon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-2xl font-bold tabular-nums text-slate-800">
            {angka.toLocaleString("id-ID")}
          </div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}
