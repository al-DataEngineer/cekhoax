import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { analisisBerita, aiSiap } from "@/lib/ai";
import { ambilDomain } from "@/lib/utils";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cariUrl(text: string): string | null {
  try {
    const u = new URL(text.trim());
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    // bukan URL
  }
  return null;
}

async function ambilKontenHalaman(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(12_000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const judul =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim();
  const ringkasan =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";
  return { judul, ringkasan, domain: ambilDomain(url) };
}

export async function POST(request: Request) {
  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }
  if (!aiSiap()) {
    return NextResponse.json({ error: "ZAI_API_KEY belum diatur" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { q?: string };
  const query = (body.q ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Masukkan judul atau URL berita" }, { status: 400 });
  }

  const url = cariUrl(query);

  if (url && url.length < 300) {
    const { data: byUrl } = await supabase
      .from("berita")
      .select("*")
      .eq("url", url)
      .limit(1);
    if (byUrl?.length) return NextResponse.json({ hasil: byUrl[0], dari: "database" });

    try {
      const konten = await ambilKontenHalaman(url);
      const hasil = await analisisBerita({
        judul: konten.judul || query.slice(0, 200),
        ringkasan: konten.ringkasan,
        sumber: konten.domain,
      });
      const { data: tersimpan } = await supabase
        .from("berita")
        .upsert(
          {
            judul: konten.judul,
            url,
            sumber: konten.domain || "Cek Manual",
            ringkasan: konten.ringkasan || null,
            gambar: null,
            status: hasil.status,
            confidence: hasil.confidence,
            kategori: hasil.kategori,
            alasan: JSON.stringify(hasil.alasan),
            dianalisis_at: new Date().toISOString(),
          },
          { onConflict: "url", ignoreDuplicates: true }
        )
        .select("*");
      const row = tersimpan?.[0] ?? (await supabase.from("berita").select("*").eq("url", url).limit(1)).data?.[0];
      return NextResponse.json({ hasil: row ?? null, dari: "ai" });
    } catch (e) {
      return NextResponse.json(
        { error: `Gagal membaca halaman: ${(e as Error).message}` },
        { status: 502 }
      );
    }
  }

  const { data: byJudul } = await supabase
    .from("berita")
    .select("*")
    .ilike("judul", `%${query.slice(0, 120)}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (byJudul?.length) return NextResponse.json({ hasil: byJudul[0], daftar: byJudul, dari: "database" });

  const hasil = await analisisBerita({ judul: query.slice(0, 300), sumber: "Cek Manual" });
  const { data: tersimpan } = await supabase
    .from("berita")
    .insert({
      judul: query.slice(0, 300),
      url: `cek-manual://${Date.now()}`,
      sumber: "Cek Manual",
      status: hasil.status,
      confidence: hasil.confidence,
      kategori: hasil.kategori,
      alasan: JSON.stringify(hasil.alasan),
      dianalisis_at: new Date().toISOString(),
    })
    .select("*");
  return NextResponse.json({ hasil: tersimpan?.[0] ?? null, dari: "ai" });
}