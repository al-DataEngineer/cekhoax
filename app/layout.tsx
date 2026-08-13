import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CekHoax — Cek Berita Hoax dengan AI",
    template: "%s | CekHoax",
  },
  description:
    "Pantau dan cek berita hoax Indonesia secara otomatis. Berita dari Kompas, CNN Indonesia, Detik dianalisis AI setiap 10 menit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <ChatWidget />
        <footer className="border-t border-sky-100 bg-white/60 backdrop-blur-sm py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center text-sm text-slate-500 sm:flex-row sm:justify-between">
            <span>CekHoax · Dipantau AI setiap 10 menit · Data dari RSS publik media berita</span>
            <span className="text-xs text-slate-400">Cek hoax sebelum menyebar. Halaman ini untuk customer.</span>
            <a
              href="/admin"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-sky-600"
            >
              <Lock className="h-3 w-3" />
              Area Admin
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
