export type StatusBerita = "hoax" | "fakta" | "mencurigakan" | "pending";

export interface Berita {
  id: string;
  judul: string;
  url: string;
  sumber: string;
  gambar?: string | null;
  ringkasan?: string | null;
  kategori?: string | null;
  status: StatusBerita;
  confidence?: number | null;
  alasan?: string | null;
  sumber_cek?: string | null;
  dipublikasi_at?: string | null;
  dianalisis_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ItemRss {
  judul: string;
  url: string;
  ringkasan?: string;
  gambar?: string;
  sumber: string;
  kategori?: string;
  dipublikasiAt?: string;
}

export interface HasilAi {
  status: Exclude<StatusBerita, "pending">;
  confidence: number;
  kategori: string;
  alasan: string[];
}
