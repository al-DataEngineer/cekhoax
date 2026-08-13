import type { HasilAi } from "./types";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.deepseek.com";
const MODEL = process.env.AI_MODEL ?? "deepseek-v4-flash";

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
  return Boolean(process.env.AI_API_KEY);
}

/** Deteksi error kuota/rate-limit dari pesan error AI */
export function apakahKuotaHabis(pesan: string): boolean {
  return /429|rate\s*limit|quota|limit/i.test(pesan);
}

export async function panggilPesanAi(
  messages: PesanAi[],
  opts: { maxTokens?: number; json?: boolean; temperature?: number } = {}
): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY belum diatur");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
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