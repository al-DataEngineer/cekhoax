import { supabase } from "./db";
import { panggilPesanAi } from "./ai";

export interface InsightTren {
  ringkasan: string[];
  sumber?: "ai" | "statistik";
  dibuat_at?: string;
}

const TTL_JAM = 24;
const TTL_FALLBACK_MS = 10 * 60_000;

declare global {
  var cekhoaxInsightCache: { data: InsightTren; waktu: number } | undefined;
}

interface StatistikTren {
  total: number;
  hoax: number;
  fakta: number;
  mencurigakan: number;
  pending: number;
  topKategoriHoax: Array<{ kategori: string; jumlah: number }>;
  hoaxTerbaru: Array<{ judul: string; sumber: string }>;
}

async function bacaCache(): Promise<InsightTren | null> {
  try {
    const { data } = await supabase
      .from("insight")
      .select("*")
      .eq("jenis", "tren")
      .order("dibuat_at", { ascending: false })
      .limit(1);
    const row = data?.[0] as
      | { isi?: InsightTren; dibuat_at?: string }
      | undefined;
    if (!row?.isi?.ringkasan?.length) return null;
    const umurJam =
      (Date.now() - new Date(row.dibuat_at ?? 0).getTime()) / 3_600_000;
    if (umurJam >= TTL_JAM) return null;
    return { ...row.isi, dibuat_at: row.dibuat_at };
  } catch {
    // tabel insight belum dibuat — lanjut ke cache memori
  }

  const c = globalThis.cekhoaxInsightCache;
  if (!c) return null;
  const ttl = c.data.sumber === "ai" ? TTL_JAM * 3_600_000 : TTL_FALLBACK_MS;
  if (Date.now() - c.waktu >= ttl) return null;
  return c.data;
}

function simpanMemori(data: InsightTren) {
  globalThis.cekhoaxInsightCache = { data, waktu: Date.now() };
}

async function hitungStatistik(): Promise<StatistikTren> {
  const { data } = await supabase
    .from("berita")
    .select("id, status, kategori, judul, sumber")
    .order("created_at", { ascending: false })
    .limit(400);

  const semua = (data ?? []) as Array<{
    status: string;
    kategori?: string | null;
    judul: string;
    sumber: string;
  }>;

  const hitung = (s: string) =>
    semua.filter((b) => b.status === s).length;

  const byKategori = new Map<string, number>();
  semua
    .filter((b) => b.status === "hoax" && b.kategori)
    .forEach((b) =>
      byKategori.set(b.kategori as string, (byKategori.get(b.kategori as string) ?? 0) + 1)
    );
  const topKategoriHoax = [...byKategori.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kategori, jumlah]) => ({ kategori, jumlah }));

  const hoaxTerbaru = semua
    .filter((b) => b.status === "hoax")
    .slice(0, 3)
    .map((b) => ({ judul: b.judul, sumber: b.sumber }));

  return {
    total: semua.length,
    hoax: hitung("hoax"),
    fakta: hitung("fakta"),
    mencurigakan: hitung("mencurigakan"),
    pending: hitung("pending"),
    topKategoriHoax,
    hoaxTerbaru,
  };
}

function formatStatistik(s: StatistikTren): string {
  const kategori = s.topKategoriHoax.length
    ? `\nKategori hoax terbanyak: ${s.topKategoriHoax
        .map((k) => `${k.kategori} (${k.jumlah})`)
        .join(", ")}`
    : "";
  const contoh = s.hoaxTerbaru.length
    ? `\nContoh hoax terbaru:\n${s.hoaxTerbaru
        .map((h, i) => `${i + 1}. "${h.judul}" (${h.sumber})`)
        .join("\n")}`
    : "";
  return `Total ${s.total} berita terpantau: ${s.hoax} hoax, ${s.fakta} fakta, ${s.mencurigakan} mencurigakan, ${s.pending} menunggu analisis.${kategori}${contoh}`;
}

function fallbackStatistik(s: StatistikTren): string[] {
  const baris = [
    `${s.total} berita terpantau: ${s.hoax} hoax, ${s.fakta} fakta, ${s.mencurigakan} mencurigakan.`,
  ];
  if (s.topKategoriHoax.length) {
    baris.push(
      `Kategori paling rawan hoax: ${s.topKategoriHoax
        .map((k) => k.kategori)
        .join(", ")}.`
    );
  }
  if (s.hoaxTerbaru.length) {
    baris.push(
      `Hoax terbaru: ${s.hoaxTerbaru.map((h) => `"${h.judul.slice(0, 60)}"`).join(", ")}.`
    );
  }
  baris.push("Waspadai berita berjudul ekstrem, tanpa sumber resmi, dan tanpa tanggal jelas.");
  return baris;
}

async function cobaNarasiAi(s: StatistikTren): Promise<string[] | null> {
  try {
    const sistem = `Kamu analis data wawasan media Indonesia. Berdasarkan data statistik berita di bawah, buat narasi wawasan singkat untuk pembaca awam.
Balas HANYA dengan JSON format: {"ringkasan": ["4 kalimat insight berguna, Bahasa Indonesia, tanpa judul", ...]}
Fokus pada pola hoax, kategori rawan, dan tips kewaspadaan. Jangan menyebut "AI". Jangan mengarang di luar data.`;
    const konten = await panggilPesanAi(
      [
        { role: "system", content: sistem },
        { role: "user", content: formatStatistik(s) },
      ],
      { json: true, maxTokens: 400, temperature: 0.5 }
    );
    const parsed = JSON.parse(konten) as { ringkasan?: unknown };
    if (!Array.isArray(parsed.ringkasan)) return null;
    const ringkasan = parsed.ringkasan.map(String).filter(Boolean).slice(0, 4);
    return ringkasan.length ? ringkasan : null;
  } catch {
    return null;
  }
}

export async function ambilInsightTren(): Promise<InsightTren> {
  const cache = await bacaCache();
  if (cache) return cache;

  const statistik = await hitungStatistik();
  const narasi = await cobaNarasiAi(statistik);

  if (narasi) {
    const insight: InsightTren = { ringkasan: narasi, sumber: "ai" };
    simpanMemori(insight);
    try {
      await supabase
        .from("insight")
        .upsert(
          { jenis: "tren", isi: insight, dibuat_at: new Date().toISOString() },
          { onConflict: "jenis" }
        );
    } catch {
      // tabel belum dibuat — biarkan, tidak fatal
    }
    return { ...insight, dibuat_at: new Date().toISOString() };
  }

  const insight: InsightTren = {
    ringkasan: fallbackStatistik(statistik),
    sumber: "statistik",
  };
  simpanMemori(insight);
  return insight;
}