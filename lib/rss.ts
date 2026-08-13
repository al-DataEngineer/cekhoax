import Parser from "rss-parser";
import { SUMBER_BERITA, type SumberBerita } from "./site";
import type { ItemRss } from "./types";

const parser = new Parser({
  timeout: 7000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; CekHoaxBot/1.0; +https://cekhoax.example) RSS reader",
  },
});

interface FeedItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  enclosure?: { url?: string };
}

function bersihkanHtml(teks?: string): string {
  return (teks ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function pisahkanJudulGoogleNews(titel: string): { judul: string; sumber?: string } {
  const idx = titel.lastIndexOf(" - ");
  if (idx > 10) {
    return { judul: titel.slice(0, idx).trim(), sumber: titel.slice(idx + 3).trim() };
  }
  return { judul: titel };
}

async function ambilItemSumber(sumber: SumberBerita): Promise<ItemRss[]> {
  for (const feedUrl of sumber.feed) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items: ItemRss[] = [];
      for (const raw of feed.items.slice(0, 25) as FeedItem[]) {
        if (!raw.title || !raw.link) continue;
        const { judul, sumber: sumberItem } = sumber.googleNews
          ? pisahkanJudulGoogleNews(raw.title)
          : { judul: raw.title, sumber: undefined };

        items.push({
          judul: judul.trim(),
          url: raw.link,
          ringkasan: bersihkanHtml(raw.contentSnippet ?? raw.content) || undefined,
          gambar:
            raw.enclosure?.url && raw.enclosure.url.startsWith("http")
              ? raw.enclosure.url
              : undefined,
          sumber: sumberItem || sumber.nama,
          kategori: feed.title?.replace(/rss|feed/i, "").trim() || undefined,
          dipublikasiAt: raw.isoDate,
        });
      }
      return items;
    } catch {
      // coba feed cadangan berikutnya
    }
  }
  return [];
}

export async function ambilSemuaBeritaRss(): Promise<ItemRss[]> {
  const hasil = await Promise.all(SUMBER_BERITA.map(ambilItemSumber));
  return hasil.flat();
}