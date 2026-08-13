import { NextResponse } from "next/server";
import { supabase, supabaseSiap } from "@/lib/db";
import { loginValid, tolakLogin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!loginValid(request.headers)) return tolakLogin();

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