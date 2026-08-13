import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { decodeProposal, encodeAlasanFinal } from "@/lib/proposal";
import { loginValid, tolakLogin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();

  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    keputusan?: string;
  };
  const id = (body.id ?? "").trim();
  if (!id || !["acc", "tolak"].includes(body.keputusan ?? "")) {
    return NextResponse.json(
      { error: "Parameter id dan keputusan (acc/tolak) wajib" },
      { status: 400 }
    );
  }

  const { data: rows, error: fetchErr } = await supabase
    .from("berita")
    .select("id, judul, alasan")
    .eq("id", id)
    .limit(1);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  const row = rows?.[0];
  if (!row) {
    return NextResponse.json({ error: "Berita tidak ditemukan" }, { status: 404 });
  }

  const proposal = decodeProposal(row.alasan as string);
  if (!proposal) {
    return NextResponse.json(
      { error: "Berita ini bukan usulan AI (belum/berbeda format analisis)" },
      { status: 400 }
    );
  }

  if (body.keputusan === "acc") {
    const { error } = await supabase
      .from("berita")
      .update({
        status: proposal.status_usulan,
        confidence: proposal.confidence,
        kategori: proposal.kategori,
        alasan: encodeAlasanFinal(proposal.alasan),
        dianalisis_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, hasil: { status: proposal.status_usulan } });
  }

  const { error } = await supabase
    .from("berita")
    .update({
      status: "pending",
      confidence: null,
      kategori: null,
      alasan: null,
      dianalisis_at: null,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tolak: true });
}