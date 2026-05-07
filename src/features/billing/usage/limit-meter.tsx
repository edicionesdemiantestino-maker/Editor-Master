"use client";

type Props = {
  label: string;
  used: number;
  limit: number;
};

export function LimitMeter({ label, used, limit }: Props) {
  const cap = Math.max(0, limit);
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;

  const tone =
    pct >= 100
      ? "bg-gradient-to-r from-red-500 to-rose-500"
      : pct >= 80
        ? "bg-gradient-to-r from-amber-500 to-orange-500"
        : "bg-gradient-to-r from-indigo-500 to-violet-500";

  const remaining = Math.max(0, cap - used);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="relative flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-100">{label}</span>
        <span className="text-xs tabular-nums text-zinc-400">
          {used} / {cap || "∞"} · {pct}%
        </span>
      </div>
      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${tone} transition-[width] duration-500 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      <p className="relative mt-2 text-xs text-zinc-400">
        Restante hoy:{" "}
        <span className="font-semibold text-white">{cap > 0 ? remaining : "—"}</span>
      </p>
    </div>
  );
}
