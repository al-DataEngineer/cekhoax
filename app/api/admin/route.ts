import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { loginValid, tolakLogin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const STATUS_VALID = ["hoax", "fakta", "mencurigakan"];

function cekAuth(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();
  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }
  return null;
}

export async function GET(request: Request) {
  const gagalAuth = cekAuth(request);
  if (gagalAuth) return gagalAuth;

  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim();

  let query = supabase
    .from("berita")
    .select("id, judul, url, sumber, status, confidence, kategori, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (q) {
    query = query.ilike("judul", `%${q}%`);
  }

  const status = (sp.get("status") ?? "").trim();
  if (["hoax", "fakta", "mencurigakan", "pending"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ berita: data ?? [] });
}

export async function POST(request: Request) {
  const gagalAuth = cekAuth(request);
  if (gagalAuth) return gagalAuth;

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