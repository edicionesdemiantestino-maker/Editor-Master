"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  date: string;
  inpaint_count: number;
  export_count: number;
  total_cost: number;
};

type ApiPayload = {
  days: number;
  plan: string;
  planProductLimits?: { maxExportsPerDay: number; maxProjects: number; brandKit: boolean };
  usage: Row[];
};

export function DashboardUsageTimeseries() {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/usage?days=30")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("usage_fetch_failed");
        }
        return (await r.json()) as ApiPayload;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar la serie.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => data?.usage ?? [], [data]);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-500">
        Cargando gráfico…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
        <span>
          Plan: <strong className="text-zinc-200">{data.plan}</strong>
        </span>
        {data.planProductLimits ? (
          <span className="text-zinc-500">
            · tope exports/día (producto):{" "}
            <strong className="text-zinc-300">{data.planProductLimits.maxExportsPerDay}</strong>
          </span>
        ) : null}
      </div>
      <div className="h-72 w-full rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
        {!chartData.length ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Sin datos agregados en este rango.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fafafa",
                }}
              />
              <Legend formatter={(value) => <span className="text-zinc-300">{value}</span>} />
              <Line type="monotone" dataKey="export_count" name="Exports día" stroke="#818cf8" dot={false} />
              <Line type="monotone" dataKey="inpaint_count" name="Inpaints día" stroke="#f472b6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
