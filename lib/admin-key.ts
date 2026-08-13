const KUNCI_STORAGE = "ckh_admin_key";

export function ambilKunciAdmin(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(KUNCI_STORAGE) ?? "";
}

export function simpanKunciAdmin(kunci: string) {
  window.sessionStorage.setItem(KUNCI_STORAGE, kunci);
}

export function hapusKunciAdmin() {
  window.sessionStorage.removeItem(KUNCI_STORAGE);
}

export function headerAdmin(kunci: string): Record<string, string> {
  return { "x-admin-key": kunci };
}