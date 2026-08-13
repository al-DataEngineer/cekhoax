import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { loginValid, tolakLogin } from "@/lib/admin-auth";
import {
  URL_KONFIG,
  bacaKonfigAnalisis,
  simpanKonfigAnalisis,
  sumberAktif,
  type KonfigAnalisis,
} from "@/lib/konfig";
import { SUMBER_BERITA } from "@/lib/site";
import { analisisBerita } from "@/lib/ai";
import { encodeProposal } from "@/lib/proposal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAKS_JALANKAN = 10;
const TUNDA_MS = 1200;

const SEMUA_SUMBER = SUMBER_BERITA.map((s) => s.nama);

type ItemAntrean = { id: string; judul: string; url: string; sumber: string; ringkasan: string | null };

function tunda(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();
  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const konfig = await bacaKonfigAnalisis();

  const { data: antrean } = await supabase
    .from("berita")
    .select("sumber")
    .eq("status", "pending")
    .is("alasan", null)
    .neq("url", URL_KONFIG)
    .limit(5000);

  const perSumber = new Map<string, number>();
  for (const r of (antrean ?? []) as Array<{ sumber: string }>) {
    perSumber.set(r.sumber, (perSumber.get(r.sumber) ?? 0) + 1);
  }
  const daftar = SEMUA_SUMBER.map((nama) => ({
    nama,
    jumlah: perSumber.get(nama) ?? 0,
    aktif: konfig.sumber.length ? konfig.sumber.includes(nama) : true,
  }));

  const totalAntrean = (antrean ?? []).length;

  return NextResponse.json({ konfig, daftar, totalAntrean });
}

export async function POST(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();
  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    auto?: boolean;
    sumber?: string[];
    jalankan?: boolean;
  };

  const konfigLama = await bacaKonfigAnalisis();
  const konfig: KonfigAnalisis = {
    auto: typeof body.auto === "boolean" ? body.auto : konfigLama.auto,
    sumber: Array.isArray(body.sumber)
      ? body.sumber.filter((s) => SEMUA_SUMBER.includes(s))
      : konfigLama.sumber,
  };

  const errSimpan = await simpanKonfigAnalisis(konfig);
  if (errSimpan) {
    return NextResponse.json({ error: errSimpan.message }, { status: 500 });
  }

  const laporan = { dianalisis: 0, gagal: 0 };

  if (body.jalankan) {
    const aktif = sumberAktif(konfig, SEMUA_SUMBER);

    let query = supabase
      .from("berita")
      .select("id, judul, url, sumber, ringkasan")
      .eq("status", "pending")
      .is("alasan", null)
      .neq("url", URL_KONFIG)
      .order("created_at", { ascending: true })
      .limit(MAKS_JALANKAN);
    if (aktif.length) {
      query = query.in("sumber", aktif);
    }
    const { data: antrean } = await query;
    const items = ((antrean ?? []) as ItemAntrean[]).slice(0, MAKS_JALANKAN);

    let counter = 0;
    for (const item of items) {
      try {
        const hasil = await analisisBerita({
          judul: item.judul,
          ringkasan: item.ringkasan ?? undefined,
          sumber: item.sumber,
        });
        const { error } = await supabase
          .from("berita")
          .update({
            status: "pending",
            confidence: hasil.confidence,
            kategori: hasil.kategori,
            alasan: encodeProposal({
              status_usulan: hasil.status,
              confidence: hasil.confidence,
              kategori: hasil.kategori,
              alasan: hasil.alasan,
            }),
            dianalisis_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;
        laporan.dianalisis++;
      } catch (e) {
        laporan.gagal++;
        console.error("Gagal analisis manual:", item.url, e);
      }
      counter++;
      if (counter < items.length) await tunda(TUNDA_MS);
    }
  }

  return NextResponse.json({ ok: true, konfig, laporan });
}