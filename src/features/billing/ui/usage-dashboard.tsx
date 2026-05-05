"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UsagePoint = {
  date: string;
  inpaint_count: number;
  export_count: number;
  total_cost: number;
};

const MONTHLY_LIMIT_USD = 10;

export function UsageDashboard() {
  const [data, setData] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/usage?days=30")
      .then((r) => r.json())
      .then((d) => setData((d.usage ?? []) as UsagePoint[]))
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => data.reduce((acc, d) => acc + Number(d.total_cost), 0),
    [data],
  );

  if (loading) return <p className="p-6">Cargando...</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h2 className="text-lg font-semibold">Uso y costos</h2>

      <div className="flex flex-wrap gap-4">
        <Card title="Total gastado" value={`$${total.toFixed(2)}`} />
        <Card title="Límite mensual" value={`$${MONTHLY_LIMIT_USD}`} />
        <Card
          title="Uso"
          value={`${Math.round((total / MONTHLY_LIMIT_USD) * 100)}%`}
        />
      </div>

      {total > MONTHLY_LIMIT_USD * 0.8 && (
        <div className="rounded-md bg-yellow-100 p-3 text-sm text-zinc-900 dark:bg-yellow-950 dark:text-zinc-50">
          Estás cerca de tu límite mensual
        </div>
      )}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <ReferenceLine y={MONTHLY_LIMIT_USD} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="total_cost" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

