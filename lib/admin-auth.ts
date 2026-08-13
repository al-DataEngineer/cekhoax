import { NextResponse } from "next/server";

const USER_BENAR = process.env.ADMIN_USERNAME ?? "admin";
const PASS_BENAR = process.env.ADMIN_PASSWORD ?? "admin123";

export function loginValid(headers: Headers): boolean {
  const key = headers.get("x-admin-key");
  const user = headers.get("x-admin-user");
  const pass = headers.get("x-admin-password");
  if (process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) return true;
  return user === USER_BENAR && pass === PASS_BENAR;
}

export function tolakLogin() {
  return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
}