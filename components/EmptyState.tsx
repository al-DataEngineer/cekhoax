import { SearchX } from "lucide-react";
import Link from "next/link";

export default function EmptyState({
  mode,
}: {
  mode: "filter" | "kosong" | "setup";
}) {
  if (mode === "setup") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
        <p className="text-sm font-semibold text-amber-800">
          Supabase belum dikonfigurasi
        </p>
        <p className="mt-2 text-sm text-amber-700">
          Isi <code className="rounded bg-amber-100 px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          dan <code className="rounded bg-amber-100 px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          di <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code>, lalu jalankan{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5">supabase/schema.sql</code> di SQL
          Editor project Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-50 text-sky-400">
        <SearchX className="h-8 w-8" />
      </span>
      <p className="font-semibold text-slate-700">
        {mode === "kosong"
          ? "Belum ada berita. Cron akan segera mengumpulkan data."
          : "Tidak ada berita yang cocok dengan filter."}
      </p>
      {mode === "kosong" && (
        <Link
          href="/cek"
          className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
        >
          Cek berita secara manual
        </Link>
      )}
    </div>
  );
}
