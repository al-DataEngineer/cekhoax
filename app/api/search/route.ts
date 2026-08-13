import { NextResponse } from "next/server";
import { panggilPesanAi, apakahKuotaHabis } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { q?: string };
  const q = (body.q ?? "").trim();
  if (!q || q.length > 300) {
    return NextResponse.json(
      { error: "Masukkan kata pencarian (maks 300 karakter)." },
      { status: 400 }
    );
  }

  try {
    const sistem = `Kamu asisten pencarian situs CekHoax (arsip berita Indonesia yang sudah dianalisis hoax/fakta).
Ubah maksud pertanyaan pengguna menjadi kata kunci pencarian + filter yang pas.
Balas HANYA dengan JSON (tanpa teks lain):
{"kataKunci": ["3-6 kata atau frasa pendek, huruf kecil, tanpa tanda baca"], "status": null | "hoax" | "fakta" | "mencurigakan", "kategori": null | "nama kategori yang cocok"}
Contoh: "subsidi yang ternyata hoax" → {"kataKunci":["subsidi","hoax","pemerintah"],"status":"hoax","kategori":null}`;
    const konten = await panggilPesanAi(
      [
        { role: "system", content: sistem },
        { role: "user", content: q.slice(0, 300) },
      ],
      { json: true, maxTokens: 200, temperature: 0.2 }
    );

    const parsed = JSON.parse(konten) as {
      kataKunci?: unknown;
      status?: unknown;
      kategori?: unknown;
    };

    const kataKunci = Array.isArray(parsed.kataKunci)
      ? [
          ...new Set(
            parsed.kataKunci
              .map((k) => String(k).toLowerCase().trim().slice(0, 40))
              .filter((k) => k.length > 1)
          ),
        ].slice(0, 6)
      : [];

    const status =
      parsed.status === "hoax" ||
      parsed.status === "fakta" ||
      parsed.status === "mencurigakan"
        ? parsed.status
        : null;

    const kategori =
      typeof parsed.kategori === "string" && parsed.kategori.trim()
        ? parsed.kategori.trim().slice(0, 60)
        : null;

    return NextResponse.json({
      kataKunci: kataKunci.length ? kataKunci : [q.toLowerCase().slice(0, 80)],
      status,
      kategori,
      offline: false,
    });
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    console.error("Cari AI gagal:", pesan);
    return NextResponse.json({
      kataKunci: [q.toLowerCase().slice(0, 80)],
      status: null,
      kategori: null,
      offline: apakahKuotaHabis(pesan),
    });
  }
}