import { NextResponse } from "next/server";
import { jawabAsisten, pesanKuotaHabis, type RiwayatChat } from "@/lib/chat";
import { aiSiap } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!aiSiap()) {
    return NextResponse.json(
      { error: "AI belum dikonfigurasi (AI_API_KEY)" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    pesan?: string;
    beritaId?: string;
    riwayat?: RiwayatChat[];
  };

  const pesan = (body.pesan ?? "").trim();
  if (pesan.length < 3 || pesan.length > 2000) {
    return NextResponse.json(
      { error: "Tulis pertanyaanmu terlebih dahulu (3–2000 karakter)." },
      { status: 400 }
    );
  }

  const beritaId = typeof body.beritaId === "string" ? body.beritaId.slice(0, 64) : undefined;

  try {
    const jawaban = await jawabAsisten({ pesan, beritaId, riwayat: body.riwayat });
    return NextResponse.json({ jawaban });
  } catch (e) {
    console.error("Chat AI gagal:", e);
    return NextResponse.json(
      { error: pesanKuotaHabis(e) },
      { status: 503 }
    );
  }
}