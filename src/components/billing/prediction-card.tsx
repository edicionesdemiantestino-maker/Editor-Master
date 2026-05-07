"use client";

export function PredictionCard({
  daysLeft,
  monthlyProjection,
}: {
  daysLeft: number | null;
  monthlyProjection: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-200 hover:scale-[1.01]">
      <div className="pointer-events-none absolute -top-16 -left-12 h-40 w-56 bg-gradient-to-r from-indigo-500/15 to-transparent blur-2xl" />

      <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
        Prediction
      </div>
      <div className="mt-3 text-sm text-white/80">
        {daysLeft == null
          ? "At this rate, we need more recent usage to estimate days left."
          : `At this rate, you have ~${daysLeft} days left`}
      </div>
      <div className="mt-2 text-xs text-white/55">
        Estimated monthly usage:{" "}
        <span className="font-semibold text-white/80 tabular-nums">
          {monthlyProjection == null ? "—" : monthlyProjection}
        </span>{" "}
        credits
      </div>
    </div>
  );
}

