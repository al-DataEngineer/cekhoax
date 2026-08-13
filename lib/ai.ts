import type { HasilAi } from "./types";

export interface ProviderAi {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/** Daftar provider AI dengan urutan prioritas (gagal 429/distim → coba berikutnya) */
const DAFTAR_PROVIDER: ProviderAi[] = [
  {
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL ?? "https://opencode.ai/zen/v1",
    model: process.env.AI_MODEL ?? "deepseek-v4-flash-free",
  },
  {
    apiKey: process.env.AI_API_KEY_2,
    baseUrl: process.env.AI_BASE_URL_2 ?? "https://openrouter.ai/api/v1",
    model: process.env.AI_MODEL_2 ?? "deepseek/deepseek-v4-flash:free",
  },
  {
    apiKey: process.env.AI_API_KEY_3,
    baseUrl: process.env.AI_BASE_URL_3 ?? "https://api.groq.com/openai/v1",
    model: process.env.AI_MODEL_3 ?? "llama-3.3-70b-versatile",
  },
];

export interface PesanAi {
  role: "system" | "user" | "assistant";
  content: string;
}

const PROMPT_SISTEM = `Kamu adalah asisten verifikasi berita Indonesia yang teliti dan netral.
Tugasmu mengklasifikasikan satu berita menjadi:
- "hoax": berita palsu, tidak berdasar fakta, atau menyesatkan
- "fakta": berita benar dan dapat diverifikasi dari sumber kredibel
- "mencurigakan": indikasi hoax/perlu diverifikasi lebih lanjut (klaim ekstrem, tanpa sumber, dll)

Balas HANYA dengan JSON (tanpa teks lain) dengan format:
{
  "status": "hoax" | "fakta" | "mencurigakan",
  "confidence": 0-100 (tingkat keyakinan),
  "kategori": "kategori berita singkat, mis. Politik",
  "alasan": ["alasan 1", "alasan 2", "alasan 3"] (2-4 poin analisis singkat dalam Bahasa Indonesia)
}
Jangan menebak tanpa dasar; jika informasi kurang, gunakan "mencurigakan" dengan confidence rendah.`;

export function aiSiap(): boolean {
  return DAFTAR_PROVIDER.some((p) => Boolean(p.apiKey && p.model));
}

/** Deteksi error kuota/rate-limit dari pesan error AI */
export function apakahKuotaHabis(pesan: string): boolean {
  return /429|rate\s*limit|quota|limit/i.test(pesan);
}

export async function panggilPesanAi(
  messages: PesanAi[],
  opts: { maxTokens?: number; json?: boolean; temperature?: number } = {}
): Promise<string> {
  const providerAktif = DAFTAR_PROVIDER.filter((p) => Boolean(p.apiKey && p.model));
  if (!providerAktif.length) throw new Error("AI_API_KEY belum diatur");

  let errorTerakhir: Error | null = null;
  for (const p of providerAktif) {
    try {
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(p.apiKey ? { Authorization: `Bearer ${p.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: p.model,
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxTokens ?? 700,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          messages,
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) {
        const teks = (await res.text()).slice(0, 200);
        throw new Error(`AI error ${res.status}: ${teks}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const konten = data.choices?.[0]?.message?.content;
      if (!konten) throw new Error("AI tidak mengembalikan konten");
      return konten;
    } catch (e) {
      errorTerakhir = e instanceof Error ? e : new Error(String(e));
      if (!apakahKuotaHabis(errorTerakhir.message)) break;
      console.warn(`Provider ${p.baseUrl} gagal, coba provider berikutnya:`, errorTerakhir.message);
    }
  }

  throw errorTerakhir ?? new Error("Semua provider AI gagal");
}

function ekstrakJson(teks: string): unknown {
  return JSON.parse(teks);
}

export async function analisisBerita(input: {
  judul: string;
  ringkasan?: string;
  sumber: string;
  ketat?: boolean;
}): Promise<HasilAi> {
  const konten = [
    `Judul: ${input.judul}`,
    input.ringkasan ? `Ringkasan: ${input.ringkasan}` : "",
    `Sumber: ${input.sumber}`,
  ]
    .filter(Boolean)
    .join("\n");

  const promptSistem = input.ketat
    ? `${PROMPT_SISTEM}\nBerita ini sebelumnya ditandai "mencurigakan". Lakukan telaah ulang secara lebih ketat: periksa pemutarbalikan fakta, klik-bait ekstrem, kesesuaian isi dengan judul, dan kebenaran klaim. Jangan ragu mengubah status bila bukti mendukung.`
    : PROMPT_SISTEM;

  const kontenJson = await panggilPesanAi(
    [
      { role: "system", content: promptSistem },
      { role: "user", content: konten },
    ],
    { json: true, maxTokens: 700, temperature: 0.2 }
  );

  const parsed = ekstrakJson(kontenJson) as Partial<HasilAi>;

  const statusValid = ["hoax", "fakta", "mencurigakan"] as const;
  const status = statusValid.includes(parsed.status as never)
    ? (parsed.status as HasilAi["status"])
    : "mencurigakan";

  const confidence = Math.max(
    0,
    Math.min(100, Number(parsed.confidence) || 0)
  );

  const alasan = Array.isArray(parsed.alasan)
    ? parsed.alasan.map(String).filter(Boolean).slice(0, 4)
    : [];

  return {
    status,
    confidence,
    kategori: typeof parsed.kategori === "string" ? parsed.kategori.slice(0, 60) : "Umum",
    alasan,
  };
}

/** Kredibilitas relatif tiap portal berita (0-100) — dasar skor kepercayaan terpadu */
export const KREDIBILITAS_SUMBER: Record<string, number> = {
  "Kompas": 92, "CNBC Indonesia": 90, "CNN Indonesia": 89, "Media Indonesia": 88,
  "Antara": 93, "Detik": 87, "Kumparan": 84, "IDN Times": 83, "Suara": 82,
  "Viva": 80, "Okezone": 80, "Tribun News": 78, "Merdeka": 76, "Gatra": 75,
};

/** Skor kepercayaan terpadu: 75% keyakinan AI + 25% kredibilitas portal */
export function gabungSkor(aiConfidence: number, sumber: string): number {
  const kred = KREDIBILITAS_SUMBER[sumber] ?? 75;
  return Math.round(aiConfidence * 0.75 + kred * 0.25);
}

export interface HasilVerifikasi {
  setuju: boolean;
  confidence: number;
  catatan: string;
}

/** Pas verifikasi: AI kedua meneliti ulang hasil klasifikasi pas pertama */
export async function verifikasiHasil(input: {
  judul: string;
  ringkasan?: string;
  sumber: string;
  hasil: HasilAi;
}): Promise<HasilVerifikasi | null> {
  try {
    const konten = [
      `Judul: ${input.judul}`,
      input.ringkasan ? `Ringkasan: ${input.ringkasan}` : "",
      `Sumber: ${input.sumber}`,
      `Hasil klasifikasi awal: ${input.hasil.status} (keyakinan ${input.hasil.confidence})`,
      `Alasan awal: ${input.hasil.alasan.join("; ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const kontenJson = await panggilPesanAi(
      [
        {
          role: "system",
          content: `Kamu adalah verifikator independen kedua di tim verifikasi berita Indonesia. Tugasmu meneliti ULANG hasil klasifikasi yang sudah dibuat ahli pertama dan menilai apakah keputusan itu tepat atau keliru. Bersikap skeptis: cari kelemahan logika, kontradiksi, klaim tanpa dasar, dan bias.
Balas HANYA dengan JSON (tanpa teks lain):
{
  "setuju": true/false (apakah kamu setuju dengan keputusan ahli pertama),
  "confidence": 0-100 (tingkat keyakinanmu pada keputusan yang kamu pilih),
  "catatan": "1 kalimat singkat mengapa setuju/keberatan"
}`,
        },
        { role: "user", content: konten },
      ],
      { json: true, maxTokens: 300, temperature: 0.4 }
    );

    const parsed = ekstrakJson(kontenJson) as Partial<HasilVerifikasi>;
    return {
      setuju: parsed.setuju !== false,
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || input.hasil.confidence)),
      catatan: typeof parsed.catatan === "string" ? parsed.catatan.slice(0, 300) : "",
    };
  } catch (e) {
    console.warn("Verifikasi ganda gagal (dilewati):", e);
    return null;
  }
}

/** Ringkasan otomatis 2-3 kalimat untuk berita yang datanya kurang lengkap */
export async function buatRingkasan(input: {
  judul: string;
  ringkasan?: string;
  sumber: string;
}): Promise<string | null> {
  try {
    const konten = [
      `Judul: ${input.judul}`,
      input.ringkasan ? `Ringkasan lama: ${input.ringkasan}` : "",
      `Sumber: ${input.sumber}`,
    ]
      .filter(Boolean)
      .join("\n");

    const teks = await panggilPesanAi(
      [
        {
          role: "system",
          content: `Buat ringkasan berita dalam 2-3 kalimat Bahasa Indonesia yang padat, netral, dan informatif. Balas HANYA dengan teks ringkasan, tanpa judul atau tanda kutip.`,
        },
        { role: "user", content: konten },
      ],
      { maxTokens: 250, temperature: 0.4 }
    );

    const bersih = teks.replace(/\s+/g, " ").trim();
    return bersih.length >= 25 ? bersih.slice(0, 500) : null;
  } catch (e) {
    console.warn("Ringkasan otomatis gagal (dilewati):", e);
    return null;
  }
}