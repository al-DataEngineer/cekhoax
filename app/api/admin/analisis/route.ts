import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { loginValid, tolakLogin } from "@/lib/admin-auth";
import {
  URL_KONFIG,
  bacaKonfigAnalisis,
  simpanKonfigAnalisis,
  sumberAktif,
  type KonfigAnalisis,
  type ModeAnalisis,
} from "@/lib/konfig";
import { SUMBER_BERITA } from "@/lib/site";
import { analisisBerita, buatRingkasan, gabungSkor, verifikasiHasil } from "@/lib/ai";
import { encodeProposal } from "@/lib/proposal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TUNDA_MS = 900;
const MAKS_PENDING = 10;
const MAKS_MENCURIGAKAN = 5;
const MAKS_TAUTAN = 15;
const MAKS_SCAN_DUPLIKAT = 600;

const SEMUA_SUMBER = SUMBER_BERITA.map((s) => s.nama);

type ItemAntrean = { id: string; judul: string; url: string; sumber: string; ringkasan: string | null };

function tunda(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** HEAD lalu GET sebagai cadangan; status blokir-bot (400/403/405/429) dianggap hidup, bukan mati */
async function cekUrlHidup(url: string): Promise<boolean> {
  const coba = async (method: "HEAD" | "GET") => {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok || [400, 403, 405, 429].includes(res.status)) return true;
      return false;
    } catch {
      return false;
    }
  };
  if (await coba("HEAD")) return true;
  return coba("GET");
}

function normalisasiJudul(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

export async function GET(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();
  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const konfig = await bacaKonfigAnalisis();

  const { data: antrean } = await supabase
    .from("berita")
    .select("sumber")
    .eq("status", "pending")
    .is("alasan", null)
    .neq("url", URL_KONFIG)
    .limit(5000);

  const perSumber = new Map<string, number>();
  for (const r of (antrean ?? []) as Array<{ sumber: string }>) {
    perSumber.set(r.sumber, (perSumber.get(r.sumber) ?? 0) + 1);
  }
  const daftar = SEMUA_SUMBER.map((nama) => ({
    nama,
    jumlah: perSumber.get(nama) ?? 0,
    aktif: konfig.sumber.length ? konfig.sumber.includes(nama) : true,
  }));

  const { count: stokMencurigakan } = await supabase
    .from("berita")
    .select("id", { count: "exact", head: true })
    .eq("status", "mencurigakan")
    .neq("url", URL_KONFIG);

  const { count: stokFinal } = await supabase
    .from("berita")
    .select("id", { count: "exact", head: true })
    .neq("status", "pending")
    .neq("url", URL_KONFIG);

  return NextResponse.json({
    konfig,
    daftar,
    totalAntrean: (antrean ?? []).length,
    stokMencurigakan: stokMencurigakan ?? 0,
    stokFinal: stokFinal ?? 0,
  });
}

async function simpanHasilAi(
  item: { id: string; judul: string; ringkasan: string | null; sumber: string },
  hasil: { status: "hoax" | "fakta" | "mencurigakan"; confidence: number; kategori: string; alasan: string[] },
  verifikasiGanda: boolean
) {
  const itemId = item.id;
  let verifikasi: { setuju: boolean; confidence?: number; catatan?: string } | null = null;
  if (verifikasiGanda) {
    verifikasi = await verifikasiHasil({
      judul: item.judul,
      ringkasan: item.ringkasan ?? undefined,
      sumber: item.sumber,
      hasil,
    });
  }
  const skor = gabungSkor(verifikasi?.confidence ?? hasil.confidence, item.sumber);
  return supabase
    .from("berita")
    .update({
      status: "pending",
      confidence: skor,
      kategori: hasil.kategori,
      alasan: encodeProposal({
        status_usulan: hasil.status,
        confidence: skor,
        kategori: hasil.kategori,
        alasan: hasil.alasan,
        verifikasi,
      }),
      dianalisis_at: new Date().toISOString(),
    })
    .eq("id", itemId);
}

async function analisisAntrean(
  aktif: string[],
  maks: number,
  ketat: boolean,
  verifikasiGanda: boolean
): Promise<{ dianalisis: number; gagal: number }> {
  let query = supabase
    .from("berita")
    .select("id, judul, url, sumber, ringkasan")
    .eq("status", ketat ? "mencurigakan" : "pending")
    .neq("url", URL_KONFIG)
    .order(ketat ? "confidence" : "created_at", { ascending: true })
    .limit(maks);
  if (aktif.length) {
    query = query.in("sumber", aktif);
  }
  if (!ketat) {
    query = query.is("alasan", null) as typeof query;
  }
  const { data: antrean } = await query;
  const items = ((antrean ?? []) as ItemAntrean[]).slice(0, maks);

  const laporan = { dianalisis: 0, gagal: 0 };
  let counter = 0;
  for (const item of items) {
    try {
      const hasil = await analisisBerita({
        judul: item.judul,
        ringkasan: item.ringkasan ?? undefined,
        sumber: item.sumber,
        ketat,
      });
      const { error } = await simpanHasilAi(item, hasil, verifikasiGanda);
      if (error) throw error;
      laporan.dianalisis++;
    } catch (e) {
      laporan.gagal++;
      console.error("Gagal analisis:", item.url, e);
    }
    counter++;
    if (counter < items.length) await tunda(TUNDA_MS);
  }
  return laporan;
}

async function periksaTautan(aktif: string[]) {
  let query = supabase
    .from("berita")
    .select("id, url")
    .neq("status", "pending")
    .neq("url", URL_KONFIG)
    .order("created_at", { ascending: false })
    .limit(MAKS_TAUTAN);
  if (aktif.length) {
    query = query.in("sumber", aktif);
  }
  const { data: rows } = await query;
  const items = ((rows ?? []) as Array<{ id: string; url: string }>).slice(0, MAKS_TAUTAN);

  const hasil = await Promise.allSettled(
    items.map(async (r) => ({ id: r.id, hidup: await cekUrlHidup(r.url) }))
  );
  const dipulihkan: string[] = [];
  const rusak: string[] = [];
  for (const h of hasil) {
    if (h.status !== "fulfilled") continue;
    if (h.value.hidup) dipulihkan.push(h.value.id);
    else rusak.push(h.value.id);
  }

  for (const id of rusak) {
    await supabase.from("berita").update({ sumber_cek: "url-rusak" }).eq("id", id).is("sumber_cek", null);
  }
  for (const id of dipulihkan) {
    await supabase.from("berita").update({ sumber_cek: null }).eq("id", id).is("sumber_cek", "url-rusak");
  }

  return { diperiksa: items.length, hidup: dipulihkan.length, rusak: rusak.length };
}

async function cekDuplikat(aktif: string[]) {
  let query = supabase
    .from("berita")
    .select("id, judul, sumber")
    .neq("status", "pending")
    .neq("url", URL_KONFIG)
    .limit(MAKS_SCAN_DUPLIKAT);
  if (aktif.length) {
    query = query.in("sumber", aktif);
  }
  const { data: rows } = await query;

  const map = new Map<string, Array<{ judul: string }>>();
  for (const r of (rows ?? []) as Array<{ judul: string }>) {
    const n = normalisasiJudul(r.judul);
    if (n.length < 20) continue;
    const arr = map.get(n) ?? [];
    arr.push({ judul: r.judul });
    map.set(n, arr);
  }

  const kelompok = [...map.values()].filter((a) => a.length > 1);
  return {
    kelompok: kelompok.length,
    contoh: kelompok.slice(0, 3).map((k) => ({ a: k[0].judul, b: k[1].judul })),
  };
}

async function cekKelengkapan(aktif: string[]) {
  let query = supabase
    .from("berita")
    .select("id, judul, ringkasan, gambar")
    .neq("status", "pending")
    .neq("url", URL_KONFIG)
    .limit(500);
  if (aktif.length) {
    query = query.in("sumber", aktif);
  }
  const { data: rows } = await query;

  const belumLengkap = ((rows ?? []) as Array<{
    id: string;
    judul: string | null;
    ringkasan: string | null;
    gambar: string | null;
  }>).filter((r) => !r.judul || r.judul.trim().length < 15 || !r.ringkasan || !r.gambar);

  let dilengkapi = 0;
  for (const r of belumLengkap.slice(0, 5).filter((x) => !x.ringkasan)) {
    const ringkas = await buatRingkasan({
      judul: r.judul ?? "",
      ringkasan: r.ringkasan ?? undefined,
      sumber: "",
    });
    if (!ringkas) continue;
    const { error } = await supabase.from("berita").update({ ringkasan: ringkas }).eq("id", r.id);
    if (!error) dilengkapi++;
    await tunda(TUNDA_MS);
  }

  return {
    belumLengkap: belumLengkap.length,
    dilengkapi,
    contoh: belumLengkap.slice(0, 3).map((r) => r.judul ?? "(tanpa judul)"),
  };
}

export async function POST(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();
  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    auto?: boolean;
    sumber?: string[];
    mode?: Partial<ModeAnalisis>;
    verifikasiGanda?: boolean;
    jalankan?: boolean;
  };

  const konfigLama = await bacaKonfigAnalisis();
  const konfig: KonfigAnalisis = {
    auto: typeof body.auto === "boolean" ? body.auto : konfigLama.auto,
    sumber: Array.isArray(body.sumber)
      ? body.sumber.filter((s) => SEMUA_SUMBER.includes(s))
      : konfigLama.sumber,
    mode: {
      ...konfigLama.mode,
      ...(body.mode && typeof body.mode === "object"
        ? Object.fromEntries(
            Object.entries(body.mode).map(([k, v]) => [k, typeof v === "boolean" ? v : konfigLama.mode[k as keyof ModeAnalisis]])
          )
        : {}),
    },
    verifikasiGanda:
      typeof body.verifikasiGanda === "boolean" ? body.verifikasiGanda : konfigLama.verifikasiGanda,
  };

  const errSimpan = await simpanKonfigAnalisis(konfig);
  if (errSimpan) {
    return NextResponse.json({ error: errSimpan.message }, { status: 500 });
  }

  const laporan: Record<string, unknown> = {};

  if (body.jalankan) {
    const aktif = sumberAktif(konfig, SEMUA_SUMBER);

    if (konfig.mode.tautan) laporan.tautan = await periksaTautan(aktif);
    if (konfig.mode.duplikat) laporan.duplikat = await cekDuplikat(aktif);
    if (konfig.mode.kelengkapan) laporan.kelengkapan = await cekKelengkapan(aktif);
    if (konfig.mode.mencurigakan) {
      laporan.mencurigakan = await analisisAntrean(aktif, MAKS_MENCURIGAKAN, true, konfig.verifikasiGanda);
    }
    if (konfig.mode.pending) {
      laporan.pending = await analisisAntrean(
        aktif,
        konfig.mode.mencurigakan ? 6 : konfig.verifikasiGanda ? 5 : MAKS_PENDING,
        false,
        konfig.verifikasiGanda
      );
    }
  }

  return NextResponse.json({ ok: true, konfig, laporan });
}