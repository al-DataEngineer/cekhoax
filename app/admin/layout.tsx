"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Newspaper,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ambilKunciAdmin,
  hapusKunciAdmin,
  headerAdmin,
  simpanKunciAdmin,
} from "@/lib/admin-key";

const MENU_ADMIN: Array<{ href: string; label: string; icon: typeof Bell }> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usulan", label: "Usulan AI", icon: Bell },
  { href: "/admin/input", label: "Input Manual", icon: PlusCircle },
  { href: "/admin/berita", label: "Kelola Berita", icon: Newspaper },
];

interface StatUsulan {
  count: { usulan: number };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [kunci, setKunci] = useState<string | null>(null);
  const [inputUser, setInputUser] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [memverif, setMemverif] = useState(false);
  const [gagal, setGagal] = useState(false);
  const [jumlahUsulan, setJumlahUsulan] = useState<number | null>(null);

  useEffect(() => {
    const sesi = ambilKunciAdmin();
    setKunci(sesi?.user ?? null);
  }, []);

  useEffect(() => {
    if (!kunci) return;
    const muatBadge = () => {
      fetch("/api/admin/stats", { headers: headerAdmin() })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: StatUsulan) => setJumlahUsulan(d.count.usulan ?? 0))
        .catch(() => {
          hapusKunciAdmin();
          setKunci(null);
          setJumlahUsulan(null);
        });
    };
    muatBadge();
    const timer = setInterval(muatBadge, 45000);
    return () => clearInterval(timer);
  }, [kunci]);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (!inputUser || !inputPass || memverif) return;
    setMemverif(true);
    setGagal(false);
    try {
      simpanKunciAdmin(inputUser.trim(), inputPass);
      const res = await fetch("/api/admin/stats", { headers: headerAdmin() });
      if (!res.ok) {
        hapusKunciAdmin();
        setGagal(true);
        return;
      }
      setKunci(inputUser.trim());
      setInputUser("");
      setInputPass("");
    } catch {
      hapusKunciAdmin();
      setGagal(true);
    } finally {
      setMemverif(false);
    }
  }

  function keluar() {
    hapusKunciAdmin();
    setKunci(null);
    setJumlahUsulan(null);
  }

  if (kunci === null) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-sky-100 bg-white/80 p-8 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-200">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-800">
            Dashboard Admin
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Area khusus admin — masukkan kunci admin untuk melanjutkan.
          </p>
          <form onSubmit={masuk} className="mt-6 space-y-3">
            <input
              type="text"
              value={inputUser}
              onChange={(e) => setInputUser(e.target.value)}
              placeholder="Username (admin)"
              autoComplete="username"
              className="w-full rounded-xl border border-sky-100 bg-sky-50/40 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              required
            />
            <input
              type="password"
              value={inputPass}
              onChange={(e) => setInputPass(e.target.value)}
              placeholder="Password (admin123)"
              autoComplete="current-password"
              className="w-full rounded-xl border border-sky-100 bg-sky-50/40 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              required
            />
            {gagal && (
              <p className="text-left text-xs font-medium text-rose-500">
                Username atau password salah.
              </p>
            )}
            <button
              type="submit"
              disabled={memverif || !inputUser || !inputPass}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50"
            >
              {memverif ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memverifikasi.
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Masuk Dashboard
                </>
              )}
            </button>
          </form>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-sky-600"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Kembali ke situs customer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm lg:sticky lg:top-24">
            <div className="mb-3 flex items-center gap-2.5 px-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">Area Admin</p>
                <p className="text-[11px] text-slate-400">CekHoax Dashboard</p>
              </div>
            </div>
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
              {MENU_ADMIN.map((m) => {
                const aktif =
                  m.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(m.href);
                const Icon = m.icon;
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className={cn(
                      "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition lg:w-full",
                      aktif
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-200"
                        : "text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                    {m.href === "/admin/usulan" &&
                      jumlahUsulan !== null &&
                      jumlahUsulan > 0 && (
                        <span
                          className={cn(
                            "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                            aktif ? "bg-white text-sky-600" : "bg-rose-500 text-white"
                          )}
                        >
                          {jumlahUsulan}
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-sky-100 pt-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
              >
                <ExternalLink className="h-4 w-4" />
                Lihat situs customer
              </Link>
              <button
                onClick={keluar}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}