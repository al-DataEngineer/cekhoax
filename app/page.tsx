import { supabase, supabaseSiap } from "@/lib/db";
import HomeHero from "@/components/HomeHero";
import FilterBar, { type FilterAwal } from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import InsightCard from "@/components/InsightCard";
import { ambilInsightTren, type InsightTren } from "@/lib/insight";
import type { Berita } from "@/lib/types";

export const dynamic = "force-dynamic";

interface BerandaParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BerandaPage({ searchParams }: BerandaParams) {
  const sp = await searchParams;

  const awal: FilterAwal = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
    kategori: typeof sp.kategori === "string" ? sp.kategori : undefined,
    sumber: typeof sp.sumber === "string" ? sp.sumber : undefined,
  };

  let berita: Berita[] = [];
  let counts = { total: 0, hoax: 0, fakta: 0, mencurigakan: 0 };
  let siap = supabaseSiap();
  let insight: InsightTren | null = null;

  if (siap) {
    try {
      const [hasilBerita, hitungTotal, hitungHoax, hitungFakta, hitungMencurigakan] =
        await Promise.all([
          supabase
            .from("berita")
            .select("*")
            .neq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(400),
          supabase
            .from("berita")
            .select("*", { count: "exact", head: true })
            .neq("status", "pending"),
          supabase.from("berita").select("*", { count: "exact", head: true }).eq("status", "hoax"),
          supabase.from("berita").select("*", { count: "exact", head: true }).eq("status", "fakta"),
          supabase
            .from("berita")
            .select("*", { count: "exact", head: true })
            .eq("status", "mencurigakan"),
        ]);

      if (hasilBerita.error) throw hasilBerita.error;
      berita = (hasilBerita.data ?? []) as Berita[];
      counts = {
        total: hitungTotal.count ?? berita.length,
        hoax: hitungHoax.count ?? 0,
        fakta: hitungFakta.count ?? 0,
        mencurigakan: hitungMencurigakan.count ?? 0,
      };

      insight = await ambilInsightTren();
    } catch (e) {
      console.error("Gagal memuat berita:", e);
      siap = false;
    }
  }

  return (
    <>
      <HomeHero
        total={counts.total}
        hoax={counts.hoax}
        fakta={counts.fakta}
        mencurigakan={counts.mencurigakan}
      />
      {!siap ? (
        <div className="mx-auto max-w-7xl px-4 pb-16">
          <EmptyState mode="setup" />
        </div>
      ) : (
        <>
          <div className="pt-8">
            <InsightCard insight={insight ?? { ringkasan: [] }} />
          </div>
          <div className="pt-6">
            <FilterBar items={berita} awal={awal} />
          </div>
        </>
      )}
    </>
  );
}
