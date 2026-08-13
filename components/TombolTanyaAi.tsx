"use client";

import { Sparkles } from "lucide-react";
import { bukaAsisten } from "./ChatWidget";

export default function TombolTanyaAi({
  beritaId,
  judul,
}: {
  beritaId: string;
  judul: string;
}) {
  return (
    <button
      onClick={() => bukaAsisten({ beritaId, judul })}
      className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-sky-600 shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Tanya AI
    </button>
  );
}