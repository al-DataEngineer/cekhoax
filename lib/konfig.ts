import { supabase } from "./db";

/** Baris konfigurasi khusus di tabel berita (url unik, tidak pernah tampil publik) */
export const URL_KONFIG = "konfig:analisis";

export interface ModeAnalisis {
  /** Analisis berita pending (belum pernah dianalisis) */
  pending: boolean;
  /** Telaah ulang berita yang masih berstatus mencurigakan (analisis AI lebih ketat) */
  mencurigakan: boolean;
  /** Verifikasi tautan sumber: cek URL hidup/mati, tandai yang rusak */
  tautan: boolean;
  /** Deteksi kemungkinan duplikat judul */
  duplikat: boolean;
  /** Cek kelengkapan data publik (ringkasan & judul kosong pada berita final) */
  kelengkapan: boolean;
}

export interface KonfigAnalisis {
  /** Analisis otomatis oleh cron (true = nyala, false = mati) */
  auto: boolean;
  /** Sumber yang diaktifkan; array kosong berarti semua sumber aktif */
  sumber: string[];
  /** Jenis pemeriksaan yang dijalankan oleh cron & tombol Jalankan */
  mode: ModeAnalisis;
}

const MODE_BAWAAN: ModeAnalisis = {
  pending: true,
  mencurigakan: false,
  tautan: false,
  duplikat: false,
  kelengkapan: false,
};

const KONFIG_BAWAAN: KonfigAnalisis = { auto: true, sumber: [], mode: MODE_BAWAAN };

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
      mode: {
        ...MODE_BAWAAN,
        ...(p.mode && typeof p.mode === "object" ? p.mode : {}),
      },
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