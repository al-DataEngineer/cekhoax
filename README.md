# CekHoax — Cek Berita Hoax dengan AI

Website cek berita hoax otomatis. Berita dari RSS media Indonesia (CNN Indonesia, CNBC
Indonesia, Detik, Kompas, + Google News Indonesia) dianalisis AI setiap 10 menit,
hasilnya masuk database dan ditampilkan dengan filter interaktif.

## Stack

- **Next.js 16** (React 19.2, TypeScript, Tailwind CSS 4, Turbopack)
- **Supabase** (PostgreSQL cloud gratis)
- **DeepSeek V4 Flash** — model AI murah (OpenAI-compatible), bisa diganti provider lain
- **Motion** (framer-motion) untuk animasi UI
- **GitHub Actions** — cron tiap 10 menit gratis (Vercel Hobby hanya izinkan 1x/hari)
- Deploy: **Vercel Hobby** (gratis)

## Setup lokal

```bash
npm install
cp .env.local.example .env.local   # isi: supabase url+key, AI_API_KEY, CRON_SECRET
npm run dev
```

1. Buat project di [Supabase](https://supabase.com) (free).
2. Di SQL Editor, jalankan isi `supabase/schema.sql`.
3. API key AI:
   - **Gratis (OpenCode Zen)**: key dari [workspace kamu](https://opencode.ai/zen/keys). Model `deepseek-v4-flash-free` ($0, kuota harian terbatas — kalau 429, tunggu reset; cron retry otomatis).
   - **Cadangan gratis (OpenRouter)**: [openrouter.ai](https://openrouter.ai) → Keys, `AI_API_KEY_2` + model `deepseek/deepseek-v4-flash:free` (1000 req/hari). Otomatis dipakai saat provider utama 429.
   - **Cadangan gratis (Groq)**: [console.groq.com](https://console.groq.com) → API Keys, `AI_API_KEY_3` + model `llama-3.3-70b-versatile`.
   - **DeepSeek** (murah): [platform.deepseek.com](https://platform.deepseek.com) → API Keys. Model `deepseek-v4-flash` (~$0.14/1jt token input, cukup untuk puluhan ribu berita).
4. Isi `.env.local` (lihat `.env.local.example`).

## Alur otomatis

```
GitHub Actions (tiap 10 menit)
  → GET /api/cron/sync (Authorization: Bearer $CRON_SECRET)
    → fetch RSS 13 sumber (CNN, CNBC, Kompas, Detik, Tribunnews, Liputan6,
      Tempo, Sindonews, Okezone, Katadata, IDNTimes, Kumparan via Google News
      site:<domain>, + Google News umum) — feed resmi yang memblokir server
      luar negeri otomatis diganti feed Google News per-situs
    → dedupe by URL (upsert onConflict, tidak dobel)
    → insert status "pending"
    → AI analisis berurutan (maks 10 berita/run, tunda 1,2 detik — hindari rate limit)
    → hasil AI disimpan sebagai **usulan** (status tetap pending, proposal di kolom alasan)
      → notifikasi muncul di /admin (badge "Usulan AI")
      → admin SETUJUI → status final (hoax/fakta/mencurigakan) → tampil di web
      → admin TOLAK → kembali ke antrean pending (tidak dianalisis ulang)
```

## Halaman

- `/` — dashboard + stats + daftar berita + filter (status, kategori, sumber, pencarian, sortir) + Wawasan AI
- `/berita/[id]` — detail berita, skor keyakinan AI, alasan analisis, tombol "Tanya AI"
- `/cek` — cek manual: tempel URL/judul → cocokkan database atau analisis AI on-demand
- `/admin` — dashboard admin (login username/password, default `admin`/`admin123`): kelola usulan AI, input manual, kelola berita

## Fitur AI (di seluruh sistem)

| Fitur | Lokasi | Cara kerja |
|---|---|---|
| Klasifikasi otomatis | Semua berita (cron) | AI menilai hoax/fakta/mencurigakan + confidence + alasan |
| Asisten chat | Widget melayang di **semua halaman** | `/api/chat` — AI diberi konteks database (statistik + berita terkait) |
| Chat per-berita | Halaman detail berita | Tombol "Tanya AI" membuka widget dengan konteks berita itu |
| Wawasan AI | Beranda + `/admin` | Narasi tren hoax, di-cache di tabel `insight` (1x/24 jam) |
| Pencarian semantik | Beranda | Tombol "Cari dengan AI" — `/api/search` mengubah pertanyaan jadi kata kunci + filter pas |

Catatan: saat kuota AI habis semua fitur tetap jalan dengan penurunan halus (chat
memberi pesan kuota habis, pencarian fallback kata kunci biasa, wawasan pakai statistik).

## API

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/api/cron/sync` | `Bearer $CRON_SECRET` | Ambil RSS + analisis AI + simpan |
| POST | `/api/cek` | – | Cek berita manual (DB → AI) |
| POST | `/api/chat` | – | Asisten chat AI (konteks dari DB) |
| GET | `/api/insight` | – | Wawasan AI tren hoax (cache 24 jam) |
| POST | `/api/search` | – | Ubah pertanyaan jadi kata kunci pencarian |
| POST | `/api/admin` | admin login (`x-admin-user` + `x-admin-password`) | Input berita manual + daftar berita |
| GET | `/api/admin/usulan` | admin login | Daftar usulan AI yang menunggu persetujuan |
| POST | `/api/admin/approve` | admin login | Setujui (`acc`) atau tolak (`tolak`) usulan AI |
| GET | `/api/admin/stats` | admin login | Statistik dashboard (counts, kategori, sumber, aktivitas) |
| POST | `/api/admin/hapus` | admin login | Hapus berita |

## Deploy ke Vercel + cron

1. Push ke GitHub, import repo di [Vercel](https://vercel.com) (framework otomatis: Next.js).
2. Tambahkan semua env di Vercel Dashboard → Settings → Environment Variables.
3. Di repo GitHub → Settings → Secrets and variables:
   - **Secret** `CRON_SECRET` (sama dengan di Vercel)
   - **Variable** `DEPLOY_URL` (mis. `cekhoax.vercel.app`, tanpa `https://`)
4. Workflow `.github/workflows/scrape.yml` akan otomatis memanggil `/api/cron/sync` tiap 10 menit.

## Tambah sumber berita

Edit `lib/site.ts`:

```ts
export const SUMBER_BERITA: SumberBerita[] = [
  { nama: "Antara", feed: ["https://www.antaranews.com/rss"] },
  { nama: "Tempo", feed: ["https://www.tempo.co/rss"] },
];
```

Situs tanpa RSS bisa diambil dengan feed cadangan (array `feed` dicoba berurutan).
Catatan: banyak situs Indonesia (Kompas, Detik, Tempo, Antara) memblokir RSS dari IP
datacenter/luar negeri (Vercel). Google News ID sudah termasuk di config sebagai
penjamin data selalu masuk — artikel dari situs yang diblokir tetap teragregasi lewat sana.

## Catatan

- Vercel Hobby: timeout fungsi maks 60 detik → tiap run menganalisis maks 10 berita baru;
  sisa `pending` diproses di run berikutnya.
- API key AI dipakai dari server (env), tidak pernah bocor ke browser.
- Untuk produksi: sempitkan RLS Supabase (lihat komentar di `supabase/schema.sql`).