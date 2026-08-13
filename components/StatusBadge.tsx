import { ShieldAlert, ShieldCheck, ShieldQuestion, Clock3 } from "lucide-react";
import { cn, STATUS_LABEL } from "@/lib/utils";
import type { StatusBerita } from "@/lib/types";

const KONFIG: Record<
  string,
  { warna: string; ikon: typeof ShieldAlert }
> = {
  hoax: {
    warna: "bg-rose-50 text-rose-600 border-rose-200",
    ikon: ShieldAlert,
  },
  fakta: {
    warna: "bg-emerald-50 text-emerald-600 border-emerald-200",
    ikon: ShieldCheck,
  },
  mencurigakan: {
    warna: "bg-amber-50 text-amber-600 border-amber-200",
    ikon: ShieldQuestion,
  },
  pending: {
    warna: "bg-sky-50 text-sky-600 border-sky-200",
    ikon: Clock3,
  },
};

export default function StatusBadge({
  status,
  className,
}: {
  status: StatusBerita;
  className?: string;
}) {
  const konfig = KONFIG[status] ?? KONFIG.pending;
  const Ikon = konfig.ikon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        konfig.warna,
        className
      )}
    >
      <Ikon className="h-3.5 w-3.5" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
