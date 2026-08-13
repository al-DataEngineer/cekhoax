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

  const [
    total,
    hoax,
    fakta,
    mencurigakan,
    pending,
    usulan,
    terbaru,
    usulan5,
    kategoriRows,
    sumberRows,
    waktuRows,
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
      .select("*")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("berita")
      .select("id, judul, url, sumber, alasan, dianalisis_at, created_at")
      .eq("status", "pending")
      .not("alasan", "is", null)
      .order("dianalisis_at", { ascending: false })
      .limit(5),
    supabase.from("berita").select("kategori").limit(5000),
    supabase.from("berita").select("sumber").limit(5000),
    supabase.from("berita").select("created_at").limit(5000),
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

  function agregasi(rows: Array<Record<string, unknown>> | null, kolom: string, maks: number) {
    const peta = new Map<string, number>();
    for (const r of rows ?? []) {
      const nilai = String(r[kolom] ?? "Umum").trim() || "Umum";
      peta.set(nilai, (peta.get(nilai) ?? 0) + 1);
    }
    return [...peta.entries()]
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, maks);
  }

  const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const olehHari = new Map<string, number>();
  const labelHari: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const kunci = d.toISOString().slice(0, 10);
    olehHari.set(kunci, 0);
    labelHari.push(HARI[d.getUTCDay()]);
  }
  for (const r of (waktuRows.data ?? []) as Array<{ created_at: string | null }>) {
    if (!r.created_at) continue;
    const kunci = r.created_at.slice(0, 10);
    if (olehHari.has(kunci)) olehHari.set(kunci, (olehHari.get(kunci) ?? 0) + 1);
  }

  return NextResponse.json({
    count: {
      total: total.count ?? 0,
      hoax: hoax.count ?? 0,
      fakta: fakta.count ?? 0,
      mencurigakan: mencurigakan.count ?? 0,
      pending: pending.count ?? 0,
      usulan: usulan.count ?? 0,
    },
    kategori: agregasi((kategoriRows.data ?? []) as Array<Record<string, unknown>>, "kategori", 8),
    sumber: agregasi((sumberRows.data ?? []) as Array<Record<string, unknown>>, "sumber", 8),
    aktivitas: { labels: labelHari, jumlah: [...olehHari.values()] },
    terbaru: terbaru.data ?? [],
    usulan: usulanList,
  });
}