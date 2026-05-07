"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BillingUsagePoint = {
  day: string;
  usage: number;
  projected?: number;
};

export function UsageChart({ data }: { data: BillingUsagePoint[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-200 hover:scale-[1.01]">
      <div className="pointer-events-none absolute -top-24 right-0 h-52 w-52 rounded-full bg-gradient-to-br from-cyan-400/15 to-indigo-500/10 blur-2xl" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Usage
          </div>
          <div className="mt-1 text-sm text-white/80">
            Real usage vs projection
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="usageStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.95} />
                <stop offset="60%" stopColor="#22d3ee" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f472b6" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(11,15,26,0.95)",
                color: "rgba(255,255,255,0.92)",
              }}
              formatter={(v) => [String(v ?? 0), "credits"]}
            />

            <Line
              type="monotone"
              dataKey="usage"
              stroke="url(#usageStroke)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />

            <Line
              type="monotone"
              dataKey="projected"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

