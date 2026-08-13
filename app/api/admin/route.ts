import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_VALID = ["hoax", "fakta", "mencurigakan"];

export async function POST(request: Request) {
  const key = request.headers.get("x-admin-key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Kunci admin salah" }, { status: 401 });
  }

  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    judul?: string;
    url?: string;
    sumber?: string;
    status?: string;
    confidence?: number;
    kategori?: string;
    alasan?: string;
    gambar?: string;
    sumber_cek?: string;
  };

  const judul = (body.judul ?? "").trim();
  const url = (body.url ?? "").trim();
  const sumber = (body.sumber ?? "").trim() || "Manual";
  const status = STATUS_VALID.includes(body.status ?? "") ? body.status! : "mencurigakan";

  if (!judul) {
    return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  }

  const confidence = Math.max(0, Math.min(100, Number(body.confidence) || 0));

  const { data, error } = await supabase
    .from("berita")
    .upsert(
      {
        judul,
        url: url || `manual://${Date.now()}`,
        sumber,
        gambar: body.gambar?.trim() || null,
        ringkasan: null,
        kategori: body.kategori?.trim() || null,
        status,
        confidence: confidence || null,
        alasan: body.alasan?.trim() || null,
        sumber_cek: body.sumber_cek?.trim() || null,
        dianalisis_at: new Date().toISOString(),
      },
      { onConflict: "url", ignoreDuplicates: true }
    )
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ hasil: data?.[0] ?? null });
}