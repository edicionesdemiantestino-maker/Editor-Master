"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { UsageDashboardDailyPoint } from "@/app/actions/usage-dashboard";

export type TimelineChartDatum = UsageDashboardDailyPoint & {
  dateLabel: string;
};

export function buildTimelineChartData(
  daily: UsageDashboardDailyPoint[],
): TimelineChartDatum[] {
  return daily.map((d) => ({
    ...d,
    dateLabel:
      typeof d.date === "string"
        ? d.date.slice(0, 10)
        : String(d.date).slice(0, 10),
  }));
}

type Props = {
  data: TimelineChartDatum[];
};

/** Premium area chart (same data as before — UI only). */
export function UsageChart({ data }: Props) {
  const id = useId().replace(/:/g, "");
  const expId = `colorExports-${id}`;
  const inpId = `colorInpaints-${id}`;

  if (!data.length) return null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={expId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.85} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={inpId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.85} />
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(15,23,42,0.92)",
              backdropFilter: "blur(12px)",
              color: "#f4f4f5",
            }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => <span style={{ color: "#d4d4d8" }}>{value}</span>}
          />

          <Area
            name="Exports"
            type="monotone"
            dataKey="exports"
            stroke="#818cf8"
            strokeWidth={2}
            fill={`url(#${expId})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          <Area
            name="Inpaints"
            type="monotone"
            dataKey="inpaints"
            stroke="#f472b6"
            strokeWidth={2}
            fill={`url(#${inpId})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** @deprecated Use `UsageChart` — same implementation. */
export const UsageBillingLineChart = UsageChart;
