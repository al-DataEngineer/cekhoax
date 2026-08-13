import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { ambilSemuaBeritaRss } from "@/lib/rss";
import { analisisBerita, gabungSkor, verifikasiHasil } from "@/lib/ai";
import { MAX_ANALISIS_PER_RUN, SUMBER_BERITA } from "@/lib/site";
import { encodeProposal } from "@/lib/proposal";
import { URL_KONFIG, bacaKonfigAnalisis, sumberAktif } from "@/lib/konfig";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TUNDA_MS = 1200;

function tunda(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normJudul(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
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
    autoAnalisis: true,
    telaahUlang: 0,
    duplikatTersaring: 0,
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

    const { data: judulLama } = await supabase.from("berita").select("judul").limit(5000);
    const adaJudul = new Set(
      ((judulLama ?? []) as Array<{ judul: string | null }>).map((r) => normJudul(r.judul ?? "")).filter(Boolean)
    );
    let dibuang = 0;
    const rowsUnik = rows.filter((r) => {
      const n = normJudul(r.judul);
      if (n.length < 20 || adaJudul.has(n)) {
        dibuang++;
        return false;
      }
      adaJudul.add(n);
      return true;
    });
    laporan.duplikatTersaring = dibuang;

    if (!rowsUnik.length) {
      laporan.baru = 0;
      return NextResponse.json(laporan);
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("berita")
      .upsert(rowsUnik, { onConflict: "url", ignoreDuplicates: true })
      .select("id, judul, url, sumber, ringkasan");

    if (insertErr) throw insertErr;
    const baru = inserted ?? [];
    laporan.baru = baru.length;

    const konfig = await bacaKonfigAnalisis();
    const aktif = sumberAktif(konfig, SUMBER_BERITA.map((s) => s.nama));
    laporan.autoAnalisis = konfig.auto && konfig.mode.pending !== false;

    let novel = (baru as Array<{
      id: string;
      judul: string;
      url: string;
      sumber: string;
      ringkasan: string | null;
    }>).filter((item) => aktif.length === 0 || aktif.includes(item.sumber));

    const sisaSlot = Math.max(0, MAX_ANALISIS_PER_RUN - novel.length);

    if (sisaSlot > 0) {
      let query = supabase
        .from("berita")
        .select("id, judul, url, sumber, ringkasan")
        .eq("status", "pending")
        .is("alasan", null)
        .neq("url", URL_KONFIG)
        .order("created_at", { ascending: true })
        .limit(sisaSlot);
      if (aktif.length) {
        query = query.in("sumber", aktif);
      }
      const { data: pendingLama } = await query;
      novel = [...novel, ...((pendingLama ?? []) as typeof novel)];
    }

    let counter = 0;
    const daftarAnalisis = laporan.autoAnalisis ? novel.slice(0, MAX_ANALISIS_PER_RUN) : [];
    for (const item of daftarAnalisis) {
      try {
        const hasil = await analisisBerita({
          judul: item.judul,
          ringkasan: item.ringkasan ?? undefined,
          sumber: item.sumber,
        });
        let verifikasi: { setuju: boolean; confidence?: number; catatan?: string } | null = null;
        if (konfig.verifikasiGanda) {
          verifikasi = await verifikasiHasil({
            judul: item.judul,
            ringkasan: item.ringkasan ?? undefined,
            sumber: item.sumber,
            hasil,
          });
        }
        const skor = gabungSkor(verifikasi?.confidence ?? hasil.confidence, item.sumber);
        const { error } = await supabase
          .from("berita")
          .update({
            status: "pending",
            confidence: skor,
            kategori: hasil.kategori,
            alasan: encodeProposal({
              status_usulan: hasil.status,
              confidence: skor,
              kategori: hasil.kategori,
              alasan: hasil.alasan,
              verifikasi,
            }),
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
      if (counter < daftarAnalisis.length) {
        await tunda(TUNDA_MS);
      }
    }

    laporan.telaahUlang = 0;
    if (konfig.auto && konfig.mode.mencurigakan) {
      let q2 = supabase
        .from("berita")
        .select("id, judul, url, sumber, ringkasan")
        .eq("status", "mencurigakan")
        .neq("url", URL_KONFIG)
        .order("confidence", { ascending: true })
        .limit(3);
      if (aktif.length) {
        q2 = q2.in("sumber", aktif);
      }
      const { data: mencurigakan } = await q2;
      for (const item of ((mencurigakan ?? []) as typeof novel).slice(0, 3)) {
        try {
          const hasil = await analisisBerita({
            judul: item.judul,
            ringkasan: item.ringkasan ?? undefined,
            sumber: item.sumber,
            ketat: true,
          });
          let verifikasi: { setuju: boolean; confidence?: number; catatan?: string } | null = null;
          if (konfig.verifikasiGanda) {
            verifikasi = await verifikasiHasil({
              judul: item.judul,
              ringkasan: item.ringkasan ?? undefined,
              sumber: item.sumber,
              hasil,
            });
          }
          const skor = gabungSkor(verifikasi?.confidence ?? hasil.confidence, item.sumber);
          const { error } = await supabase
            .from("berita")
            .update({
              status: "pending",
              confidence: skor,
              kategori: hasil.kategori,
              alasan: encodeProposal({
                status_usulan: hasil.status,
                confidence: skor,
                kategori: hasil.kategori,
                alasan: hasil.alasan,
                verifikasi,
              }),
              dianalisis_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          if (error) throw error;
          laporan.telaahUlang++;
        } catch (e) {
          laporan.gagal++;
          console.error("Gagal telaah ulang:", item.url, e);
        }
        await tunda(TUNDA_MS);
      }
    }

    const { count } = await supabase
      .from("berita")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .is("alasan", null)
      .neq("url", URL_KONFIG);
    laporan.sisaPending = count ?? 0;

    return NextResponse.json(laporan);
  } catch (e) {
    console.error("Cron sync gagal:", e);
    return NextResponse.json({ error: String(e), ...laporan }, { status: 500 });
  }
}