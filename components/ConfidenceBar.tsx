"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { StatusBerita } from "@/lib/types";

const WARNA_BAR: Record<string, string> = {
  hoax: "from-rose-400 to-rose-500",
  fakta: "from-emerald-400 to-emerald-500",
  mencurigakan: "from-amber-400 to-amber-500",
  pending: "from-sky-300 to-sky-400",
};

export default function ConfidenceBar({
  confidence,
  status,
  besar = false,
}: {
  confidence?: number | null;
  status: StatusBerita;
  besar?: boolean;
}) {
  const nilai = Math.max(0, Math.min(100, Number(confidence) || 0));

  return (
    <div className="w-full">
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100",
          besar ? "h-3" : "h-1.5"
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            WARNA_BAR[status] ?? WARNA_BAR.pending
          )}
          initial={{ width: 0 }}
          animate={{ width: `${nilai}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>
      {besar && (
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-600">Tingkat keyakinan AI</span>
          <span className="text-2xl font-bold text-slate-800">{nilai}%</span>
        </div>
      )}
    </div>
  );
}
