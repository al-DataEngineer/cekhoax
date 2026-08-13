import { Bot, Sparkles } from "lucide-react";
import { formatWaktu } from "@/lib/utils";
import type { InsightTren } from "@/lib/insight";

export default function InsightCard({ insight }: { insight: InsightTren }) {
  if (!insight?.ringkasan?.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-blue-50/60 p-6 shadow-sm backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-200/30 blur-2xl" />
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-800">
              Wawasan AI minggu ini
            </h2>
            <ul className="mt-3 space-y-2">
              {insight.ringkasan.map((baris, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-relaxed text-slate-600"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  {baris}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              {insight.sumber === "ai" ? (
                <>
                  <Bot className="h-3.5 w-3.5" />
                  Dihasilkan AI{insight.dibuat_at ? ` · ${formatWaktu(insight.dibuat_at)}` : ""}
                </>
              ) : (
                <>
                  <Bot className="h-3.5 w-3.5" />
                  Dihitung otomatis dari statistik (AI offline) — akan diperbarui saat kuota AI pulih
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}