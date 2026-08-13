"use client";

import Link from "next/link";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { motion } from "motion/react";
import StatusBadge from "./StatusBadge";
import ConfidenceBar from "./ConfidenceBar";
import { formatWaktuRelatif, cn } from "@/lib/utils";
import type { Berita } from "@/lib/types";

const varianItem = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" as const } },
  keluar: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export default function NewsCard({ berita }: { berita: Berita }) {
  return (
    <motion.li
      layout
      variants={varianItem}
      initial="hidden"
      animate="show"
      exit="keluar"
      className="h-full"
    >
      <Link
        href={`/berita/${berita.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100"
      >
        {berita.gambar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={berita.gambar}
            alt={berita.judul}
            loading="lazy"
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-sky-50 to-blue-100 text-sky-300">
            <Newspaper className="h-12 w-12" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={berita.status} />
            <span className="text-xs text-slate-400">
              {formatWaktuRelatif(berita.created_at)}
            </span>
          </div>

          <h3 className="line-clamp-2 font-bold leading-snug text-slate-800 transition-colors group-hover:text-sky-700">
            {berita.judul}
          </h3>

          {berita.ringkasan && (
            <p className="line-clamp-2 text-sm text-slate-500">{berita.ringkasan}</p>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                {berita.sumber}
                {berita.kategori && (
                  <span className="truncate rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-600">
                    {berita.kategori}
                  </span>
                )}
              </span>
              <ConfidenceBar confidence={berita.confidence} status={berita.status} />
            </div>
            <ArrowUpRight
              className={cn(
                "h-5 w-5 shrink-0 text-sky-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-600"
              )}
            />
          </div>
        </div>
      </Link>
    </motion.li>
  );
}
