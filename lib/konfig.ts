import { supabase } from "./db";

/** Baris konfigurasi khusus di tabel berita (url unik, tidak pernah tampil publik) */
export const URL_KONFIG = "konfig:analisis";

export interface KonfigAnalisis {
  /** Analisis otomatis oleh cron (true = nyala, false = mati) */
  auto: boolean;
  /** Sumber yang diaktifkan; array kosong berarti semua sumber aktif */
  sumber: string[];
}

const KONFIG_BAWAAN: KonfigAnalisis = { auto: true, sumber: [] };

export async function bacaKonfigAnalisis(): Promise<KonfigAnalisis> {
  try {
    const { data } = await supabase
      .from("berita")
      .select("alasan")
      .eq("url", URL_KONFIG)
      .limit(1);
    const raw = (data?.[0] as { alasan?: string | null } | undefined)?.alasan;
    if (!raw) return KONFIG_BAWAAN;
    const p = JSON.parse(raw) as Partial<KonfigAnalisis>;
    return {
      auto: typeof p.auto === "boolean" ? p.auto : KONFIG_BAWAAN.auto,
      sumber: Array.isArray(p.sumber) ? p.sumber.map(String).filter(Boolean) : [],
    };
  } catch {
    return KONFIG_BAWAAN;
  }
}

export async function simpanKonfigAnalisis(konfig: KonfigAnalisis) {
  const { error } = await supabase.from("berita").upsert(
    {
      url: URL_KONFIG,
      judul: "Konfigurasi Analisis",
      sumber: "SISTEM",
      status: "pending",
      alasan: JSON.stringify(konfig),
    },
    { onConflict: "url", ignoreDuplicates: false }
  );
  return error;
}

/** Daftar sumber yang aktif sesuai konfigurasi */
export function sumberAktif(konfig: KonfigAnalisis, daftarSumber: string[]): string[] {
  if (!konfig.sumber.length) return daftarSumber;
  return daftarSumber.filter((s) => konfig.sumber.includes(s));
}