import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { decodeProposal } from "@/lib/proposal";
import { loginValid, tolakLogin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();

  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("berita")
    .select(
      "id, judul, url, sumber, gambar, confidence, kategori, alasan, dianalisis_at, created_at"
    )
    .eq("status", "pending")
    .not("alasan", "is", null)
    .order("dianalisis_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const usulan = (data ?? [])
    .map((row) => {
      const proposal = decodeProposal(row.alasan as string);
      if (!proposal) return null;
      return {
        id: row.id,
        judul: row.judul,
        url: row.url,
        sumber: row.sumber,
        gambar: row.gambar,
        proposal,
        dianalisis_at: row.dianalisis_at ?? row.created_at,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ usulan });
}