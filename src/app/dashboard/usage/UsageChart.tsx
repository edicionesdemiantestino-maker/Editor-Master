"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type UsagePoint = {
  date: string;
  used: number;
  limit: number;
};

type Props = {
  data: UsagePoint[];
  title: string;
};

export function UsageChart({ data, title }: Props) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  const filtered = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    return data.slice(-days);
  }, [data, range]);

  const last = filtered[filtered.length - 1];
  const percent = last?.limit ? Math.round((last.used / last.limit) * 100) : 0;

  const isNearLimit = percent > 80;
  const isExceeded = percent > 100;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h3>
          <p
            className={`text-xs text-zinc-500 ${
              isExceeded
                ? "text-red-600 dark:text-red-300"
                : isNearLimit
                  ? "text-amber-700 dark:text-amber-300"
                  : ""
            }`}
          >
            {last?.used ?? 0} / {last?.limit ?? 0} usados ({percent}%)
          </p>
        </div>

        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              type="button"
              className={`rounded-md px-2 py-1 text-xs ${
                range === r
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />

            <Tooltip
              formatter={(value: any, name: any) => [
                value,
                name === "used" ? "Usados" : "Límite",
              ]}
              labelFormatter={(label) => `Fecha: ${label}`}
            />

            <Area
              dataKey="limit"
              type="monotone"
              fillOpacity={0.1}
              stroke="transparent"
              fill={isExceeded ? "#ef4444" : isNearLimit ? "#f59e0b" : "#3b82f6"}
            />

            <Line
              type="monotone"
              dataKey="limit"
              strokeDasharray="5 5"
              stroke="#71717a"
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="used"
              strokeWidth={2}
              stroke={isExceeded ? "#ef4444" : isNearLimit ? "#f59e0b" : "#3b82f6"}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

