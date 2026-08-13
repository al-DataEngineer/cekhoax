-- Jalankan di SQL Editor project Supabase
-- Database: PostgreSQL (Supabase)

create extension if not exists pgcrypto;

create table if not exists public.berita (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  url text not null unique,
  sumber text not null,
  gambar text,
  ringkasan text,
  kategori text,
  status text not null default 'pending'
    check (status in ('hoax', 'fakta', 'mencurigakan', 'pending')),
  confidence numeric check (confidence >= 0 and confidence <= 100),
  alasan text,
  sumber_cek text,
  dipublikasi_at timestamptz,
  dianalisis_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists berita_status_idx on public.berita (status);
create index if not exists berita_created_at_idx on public.berita (created_at desc);
create index if not exists berita_sumber_idx on public.berita (sumber);
create index if not exists berita_kategori_idx on public.berita (kategori);

alter table public.berita enable row level security;

-- Starter sederhana: semua operasi diizinkan untuk anon key.
-- Untuk produksi, batasi tulis hanya lewat service role / admin.
create policy "baca publik" on public.berita for select using (true);
create policy "tulis anon" on public.berita for insert with check (true);
create policy "ubah anon" on public.berita for update using (true);
create policy "hapus anon" on public.berita for delete using (true);
