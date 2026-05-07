"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/ui/glass-card";

type Point = { day: string; count: number };

export function UsageEventsForecast() {
  const [series, setSeries] = useState<Point[]>([]);
  const [prediction, setPrediction] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/usage/by-day?days=30", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? `http_${res.status}`);
        }
        return res.json() as Promise<{
          series?: Point[];
          monthlyPrediction?: number;
        }>;
      })
      .then((payload) => {
        if (!cancelled) {
          setSeries(payload.series ?? []);
          setPrediction(payload.monthlyPrediction ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los eventos agregados.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <GlassCard className="p-8">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border border-white/15 border-t-violet-400" />
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-100">{error}</p>
      </GlassCard>
    );
  }

  const chartData = series.map((r) => ({ ...r, dayLabel: r.day.slice(5) }));

  return (
    <GlassCard className="space-y-3 p-5 md:p-6">
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-white">
          Eventos de uso (total por día)
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Proyección a 30 días a partir del promedio de los últimos 7 días con datos registrados en{" "}
          <code className="text-zinc-400">usage_events</code>.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3">
        <p className="text-xs font-medium text-zinc-400">Predicción mensual (heurística)</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
          {prediction}
          <span className="ml-2 text-sm font-normal text-zinc-500">eventos / mes estimados</span>
        </p>
      </div>

      <div className="h-56 w-full">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke="#71717a"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis width={36} allowDecimals={false} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(15,14,26,0.95)",
                  color: "#fafafa",
                }}
                formatter={(v) => [String(v ?? 0), "eventos"]}
              />
              <Line type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-zinc-500">
            Sin datos en esta ventana.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
