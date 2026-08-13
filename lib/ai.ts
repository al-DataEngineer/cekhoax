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
}): Promise<HasilAi> {
  const konten = [
    `Judul: ${input.judul}`,
    input.ringkasan ? `Ringkasan: ${input.ringkasan}` : "",
    `Sumber: ${input.sumber}`,
  ]
    .filter(Boolean)
    .join("\n");

  const kontenJson = await panggilPesanAi(
    [
      { role: "system", content: PROMPT_SISTEM },
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