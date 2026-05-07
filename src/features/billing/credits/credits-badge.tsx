"use client";

import Link from "next/link";

import { useDashboardCredits } from "./use-dashboard-credits";

export function CreditsBadge() {
  const { data } = useDashboardCredits();
  const balance = data?.balance ?? null;
  const low = Boolean(data?.alerts?.lowBalance);
  const risk = Boolean(data?.alerts?.risk);

  return (
    <Link
      href="/dashboard/usage"
      className={`ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold hover:bg-white/10 ${
        low
          ? "border border-red-500/35 bg-red-500/10 text-red-100"
          : risk
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-100"
            : "border border-zinc-600/40 bg-white/5 text-zinc-100"
      }`}
      title="Créditos disponibles"
    >
      <span aria-hidden>⚡</span>
      <span className="tabular-nums">{balance == null ? "—" : balance}</span>
      <span className="text-white/60">credits</span>
    </Link>
  );
}

