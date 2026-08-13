import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { decodeProposal } from "@/lib/proposal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = request.headers.get("x-admin-key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Kunci admin salah" }, { status: 401 });
  }

  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const [
    total,
    hoax,
    fakta,
    mencurigakan,
    pending,
    usulan,
    terbaru,
    usulan5,
  ] = await Promise.all([
    supabase.from("berita").select("*", { count: "exact", head: true }),
    supabase.from("berita").select("*", { count: "exact", head: true }).eq("status", "hoax"),
    supabase.from("berita").select("*", { count: "exact", head: true }).eq("status", "fakta"),
    supabase
      .from("berita")
      .select("*", { count: "exact", head: true })
      .eq("status", "mencurigakan"),
    supabase.from("berita").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("berita")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .not("alasan", "is", null),
    supabase
      .from("berita")
      .select("id, judul, url, sumber, status, confidence, kategori, created_at")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("berita")
      .select("id, judul, url, sumber, alasan, dianalisis_at, created_at")
      .eq("status", "pending")
      .not("alasan", "is", null)
      .order("dianalisis_at", { ascending: false })
      .limit(5),
  ]);

  if (total.error) {
    return NextResponse.json({ error: total.error.message }, { status: 500 });
  }

  const usulanList = (usulan5.data ?? [])
    .map((row) => {
      const proposal = decodeProposal(row.alasan as string);
      if (!proposal) return null;
      return {
        id: row.id,
        judul: row.judul,
        url: row.url,
        sumber: row.sumber,
        proposal,
        dianalisis_at: row.dianalisis_at ?? row.created_at,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    count: {
      total: total.count ?? 0,
      hoax: hoax.count ?? 0,
      fakta: fakta.count ?? 0,
      mencurigakan: mencurigakan.count ?? 0,
      pending: pending.count ?? 0,
      usulan: usulan.count ?? 0,
    },
    terbaru: terbaru.data ?? [],
    usulan: usulanList,
  });
}