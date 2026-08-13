import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = request.headers.get("x-admin-key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Kunci admin salah" }, { status: 401 });
  }

  if (!supabaseSiap()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Parameter id wajib" }, { status: 400 });
  }

  const { error } = await supabase.from("berita").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}