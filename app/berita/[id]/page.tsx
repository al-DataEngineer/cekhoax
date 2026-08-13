import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Radio } from "lucide-react";
import { supabase, supabaseSiap } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import NewsCard from "@/components/NewsCard";
import TombolTanyaAi from "@/components/TombolTanyaAi";
import { bacaAlasan, formatWaktu, cn } from "@/lib/utils";
import type { Berita } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase.from("berita").select("judul").eq("id", id).limit(1);
  return { title: data?.[0]?.judul ?? "Detail Berita" };
}

export default async function DetailBeritaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let berita: Berita | null = null;
  let serupa: Berita[] = [];

  if (supabaseSiap()) {
    try {
      const [{ data }, { data: dataSerupa }] = await Promise.all([
        supabase.from("berita").select("*").eq("id", id).limit(1),
        supabase
          .from("berita")
          .select("*")
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      berita = (data?.[0] as Berita) ?? null;
      serupa = (dataSerupa ?? []) as Berita[];
    } catch (e) {
      console.error("Gagal memuat detail:", e);
    }
  }

  if (!berita) notFound();

  const alasan = bacaAlasan(berita.alasan);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke beranda
      </Link>

      <article className="animate-fade-in-up mt-5 overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-sky-50 p-6 pb-4">
          <StatusBadge status={berita.status} />
          {berita.kategori && (
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
              {berita.kategori}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatWaktu(berita.dipublikasi_at ?? berita.created_at)}
          </span>
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-extrabold leading-snug text-slate-800 sm:text-3xl">
            {berita.judul}
          </h1>

          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Radio className="h-4 w-4 text-sky-500" />
            Sumber: <b className="text-slate-700">{berita.sumber}</b>
            <span className="ml-auto flex items-center gap-2">
              <TombolTanyaAi beritaId={berita.id} judul={berita.judul} />
              <a
                href={berita.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100"
              >
                Buka sumber asli
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </span>
          </div>

          {berita.ringkasan && (
            <p className="mt-4 rounded-2xl bg-sky-50/60 p-4 text-sm leading-relaxed text-slate-600">
              {berita.ringkasan}
            </p>
          )}

          <div className="mt-8 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-6">
            <ConfidenceBar confidence={berita.confidence} status={berita.status} besar />

            {berita.dianalisis_at && (
              <p className="mt-3 text-xs text-slate-400">
                Dianalisis AI · {formatWaktu(berita.dianalisis_at)}
              </p>
            )}
          </div>

          {alasan.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-800">
                Alasan analisis AI
              </h2>
              <ul className="mt-4 space-y-3">
                {alasan.map((a, i) => (
                  <li
                    key={i}
                    className="animate-fade-in-up flex gap-3 rounded-2xl border border-sky-50 bg-white p-4 text-sm text-slate-600"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                        berita.status === "hoax"
                          ? "bg-rose-400"
                          : berita.status === "fakta"
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                      )}
                    >
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>

      {serupa.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-800">Berita lainnya</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            {serupa.map((b) => (
              <NewsCard key={b.id} berita={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
