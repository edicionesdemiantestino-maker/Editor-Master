"use client";

import { GlassCard } from "@/components/ui/glass-card";

import { useDashboardCredits } from "./use-dashboard-credits";

export function CreditsCard() {
  const { data, loading } = useDashboardCredits();

  if (loading) {
    return (
      <GlassCard className="p-5">
        <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-white/10" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Créditos
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
            {data?.balance ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Se consumen automáticamente en inpaint/export/AI.
          </p>
        </div>
        <a
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
          href="/dashboard/usage"
        >
          Ver detalle
        </a>
      </div>
    </GlassCard>
  );
}

