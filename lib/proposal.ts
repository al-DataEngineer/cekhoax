import type { StatusBerita } from "./types";

export interface ProposalAi {
  status_usulan: Exclude<StatusBerita, "pending">;
  confidence: number;
  kategori: string;
  alasan: string[];
}

export type StatusUsulan = ProposalAi["status_usulan"];

export function encodeProposal(p: ProposalAi): string {
  return JSON.stringify(p);
}

export function decodeProposal(raw?: string | null): ProposalAi | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<ProposalAi>;
    if (
      p?.status_usulan &&
      ["hoax", "fakta", "mencurigakan"].includes(p.status_usulan) &&
      Array.isArray(p.alasan)
    ) {
      return {
        status_usulan: p.status_usulan,
        confidence: Math.max(0, Math.min(100, Number(p.confidence) || 0)),
        kategori:
          typeof p.kategori === "string" ? p.kategori.slice(0, 60) : "Umum",
        alasan: p.alasan.map(String).filter(Boolean).slice(0, 4),
      };
    }
  } catch {
    // bukan format usulan (mis. alasan final / teks bebas)
  }
  return null;
}

export function encodeAlasanFinal(alasan: string[]): string {
  return JSON.stringify(alasan);
}