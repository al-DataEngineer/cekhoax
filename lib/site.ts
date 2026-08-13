export interface SumberBerita {
  nama: string;
  feed: string[];
  /** Feed Google News: judul item berformat "Judul - Sumber" */
  googleNews?: boolean;
}

const googleNewsSite = (domain: string) =>
  `https://news.google.com/rss/search?q=site:${domain}&hl=id&gl=ID&ceid=ID:id`;

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
    nama: "Google News",
    feed: ["https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id"],
    googleNews: true,
  },
  {
    nama: "Kompas",
    feed: [googleNewsSite("kompas.com")],
    googleNews: true,
  },
  {
    nama: "Detik",
    feed: [googleNewsSite("detik.com")],
    googleNews: true,
  },
  {
    nama: "Tribunnews",
    feed: [googleNewsSite("tribunnews.com")],
    googleNews: true,
  },
  {
    nama: "Liputan6",
    feed: [googleNewsSite("liputan6.com")],
    googleNews: true,
  },
  {
    nama: "Tempo",
    feed: [googleNewsSite("tempo.co")],
    googleNews: true,
  },
  {
    nama: "Sindonews",
    feed: [googleNewsSite("sindonews.com")],
    googleNews: true,
  },
  {
    nama: "Okezone",
    feed: [googleNewsSite("okezone.com")],
    googleNews: true,
  },
  {
    nama: "Katadata",
    feed: [googleNewsSite("katadata.co.id")],
    googleNews: true,
  },
  {
    nama: "IDNTimes",
    feed: [googleNewsSite("idntimes.com")],
    googleNews: true,
  },
  {
    nama: "Kumparan",
    feed: [googleNewsSite("kumparan.com")],
    googleNews: true,
  },
];

/** Sumber dengan feed terverifikasi stabil dari luar negeri (Vercel) */
export const SUMBER_TERVERIFIKASI = [
  "CNN Indonesia",
  "CNBC Indonesia",
  "Google News",
  "Kompas",
  "Detik",
  "Tribunnews",
  "Liputan6",
  "Tempo",
  "Sindonews",
  "Okezone",
  "Katadata",
  "IDNTimes",
  "Kumparan",
];

export const SUMBER_CEK_FAKTA = [
  { nama: "Turn Back Hoax", url: "https://turnbackhoax.id" },
  { nama: "Kominfo Hoaks", url: "https://www.kominfo.go.id" },
  { nama: "Tirto Cek Fakta", url: "https://tirto.id" },
  { nama: "Mafindo", url: "https://www.mafindo.or.id" },
];

export const MAX_ANALISIS_PER_RUN = 10;