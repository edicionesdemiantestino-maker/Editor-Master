"use client";

export function CreditBalanceCard({ balance }: { balance: number | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-200 hover:scale-[1.01]">
      <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-fuchsia-500/25 to-violet-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-amber-400/15 to-cyan-400/10 blur-2xl" />

      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Available balance
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-4xl font-semibold tracking-tight text-white tabular-nums">
            {balance == null ? "—" : balance}
          </div>
          <div className="text-sm font-semibold text-white/70">credits</div>
        </div>
        <div className="mt-2 text-xs text-white/50">
          Se consumen automáticamente en inpaint, export print y AI.
        </div>
      </div>
    </div>
  );
}

