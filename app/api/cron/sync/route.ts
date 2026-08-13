import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { ambilSemuaBeritaRss } from "@/lib/rss";
import { analisisBerita } from "@/lib/ai";
import { MAX_ANALISIS_PER_RUN } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TUNDA_MS = 1200;

function tunda(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const laporan = {
    totalRss: 0,
    baru: 0,
    dianalisis: 0,
    gagal: 0,
    sisaPending: 0,
  };

  if (!supabaseSiap()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi", ...laporan },
      { status: 500 }
    );
  }

  try {
    const items = await ambilSemuaBeritaRss();
    laporan.totalRss = items.length;
    if (!items.length) return NextResponse.json(laporan);

    const rows = items.map((item) => ({
      judul: item.judul,
      url: item.url,
      sumber: item.sumber,
      gambar: item.gambar ?? null,
      ringkasan: item.ringkasan ?? null,
      status: "pending",
      dipublikasi_at: item.dipublikasiAt ? new Date(item.dipublikasiAt).toISOString() : null,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("berita")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
      .select("id, judul, url, sumber, ringkasan");

    if (insertErr) throw insertErr;
    const baru = inserted ?? [];
    laporan.baru = baru.length;

    let novel = baru as Array<{
      id: string;
      judul: string;
      url: string;
      sumber: string;
      ringkasan: string | null;
    }>;

    const sisaSlot = Math.max(0, MAX_ANALISIS_PER_RUN - novel.length);

    if (sisaSlot > 0) {
      const { data: pendingLama } = await supabase
        .from("berita")
        .select("id, judul, url, sumber, ringkasan")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(sisaSlot);
      novel = [...novel, ...((pendingLama ?? []) as typeof novel)];
    }

    let counter = 0;
    for (const item of novel.slice(0, MAX_ANALISIS_PER_RUN)) {
      try {
        const hasil = await analisisBerita({
          judul: item.judul,
          ringkasan: item.ringkasan ?? undefined,
          sumber: item.sumber,
        });
        const { error } = await supabase
          .from("berita")
          .update({
            status: hasil.status,
            confidence: hasil.confidence,
            kategori: hasil.kategori,
            alasan: JSON.stringify(hasil.alasan),
            dianalisis_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;
        laporan.dianalisis++;
      } catch (e) {
        laporan.gagal++;
        console.error("Gagal analisis:", item.url, e);
      }
      counter++;
      if (counter < novel.slice(0, MAX_ANALISIS_PER_RUN).length) {
        await tunda(TUNDA_MS);
      }
    }

    const { count } = await supabase
      .from("berita")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    laporan.sisaPending = count ?? 0;

    return NextResponse.json(laporan);
  } catch (e) {
    console.error("Cron sync gagal:", e);
    return NextResponse.json({ error: String(e), ...laporan }, { status: 500 });
  }
}