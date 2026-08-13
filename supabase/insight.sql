-- Jalankan di SQL Editor project Supabase
-- Tabel cache "Wawasan AI" (dibuat ulang maks 1x/24 jam, hemat kuota)

create table if not exists public.insight (
  id uuid primary key default gen_random_uuid(),
  jenis text not null unique,
  isi jsonb,
  dibuat_at timestamptz not null default now()
);

alter table public.insight enable row level security;

create policy "baca insight" on public.insight for select using (true);
create policy "tulis insight" on public.insight for insert with check (true);
create policy "ubah insight" on public.insight for update using (true);
