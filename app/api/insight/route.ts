import { NextResponse } from "next/server";
import { ambilInsightTren } from "@/lib/insight";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const insight = await ambilInsightTren();
    return NextResponse.json({ insight });
  } catch (e) {
    console.error("Insight gagal:", e);
    return NextResponse.json(
      { error: "Gagal memuat wawasan AI" },
      { status: 500 }
    );
  }
}