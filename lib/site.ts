export interface SumberBerita {
  nama: string;
  feed: string[];
  /** Feed Google News: judul item berformat "Judul - Sumber" */
  googleNews?: boolean;
}

export const SUMBER_BERITA: SumberBerita[] = [
  {
    nama: "CNN Indonesia",
    feed: [
      "https://www.cnnindonesia.com/rss",
      "https://www.cnnindonesia.com/nasional/rss",
      "https://www.cnnindonesia.com/ekonomi/rss",
    ],
  },
  {
    nama: "CNBC Indonesia",
    feed: ["https://www.cnbcindonesia.com/rss"],
  },
  {
    nama: "Detik",
    feed: ["https://rss.detik.com/news"],
  },
  {
    nama: "Kompas",
    feed: ["https://rss.kompas.com"],
  },
  {
    nama: "Google News",
    feed: ["https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id"],
    googleNews: true,
  },
];

/** Sumber dengan feed terverifikasi stabil dari luar negeri (Vercel) */
export const SUMBER_TERVERIFIKASI = ["CNN Indonesia", "CNBC Indonesia", "Google News"];

export const SUMBER_CEK_FAKTA = [
  { nama: "Turn Back Hoax", url: "https://turnbackhoax.id" },
  { nama: "Kominfo Hoaks", url: "https://www.kominfo.go.id" },
  { nama: "Tirto Cek Fakta", url: "https://tirto.id" },
  { nama: "Mafindo", url: "https://www.mafindo.or.id" },
];

export const MAX_ANALISIS_PER_RUN = 10;