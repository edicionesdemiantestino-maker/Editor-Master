import type { ReactNode } from "react";

import { GlassCard } from "./glass-card";

type PremiumStatProps = {
  label: string;
  value: string | number;
  /** Optional footnote under the value (UI only). */
  hint?: ReactNode;
};

export function PremiumStat({ label, value, hint }: PremiumStatProps) {
  return (
    <GlassCard animated={false} className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-white">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-zinc-500">{hint}</div> : null}
    </GlassCard>
  );
}
