const USER_KEY = "ckh_admin_user";
const PASS_KEY = "ckh_admin_pass";

export function ambilKunciAdmin(): { user: string; pass: string } | null {
  if (typeof window === "undefined") return null;
  const user = window.sessionStorage.getItem(USER_KEY) ?? "";
  const pass = window.sessionStorage.getItem(PASS_KEY) ?? "";
  return user && pass ? { user, pass } : null;
}

export function simpanKunciAdmin(user: string, pass: string) {
  window.sessionStorage.setItem(USER_KEY, user);
  window.sessionStorage.setItem(PASS_KEY, pass);
}

export function hapusKunciAdmin() {
  window.sessionStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(PASS_KEY);
}

export function headerAdmin(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return {
    "x-admin-user": window.sessionStorage.getItem(USER_KEY) ?? "",
    "x-admin-password": window.sessionStorage.getItem(PASS_KEY) ?? "",
  };
}