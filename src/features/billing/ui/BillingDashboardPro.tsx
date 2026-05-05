"use client";

import { useEffect, useMemo, useState } from "react";

type AnalyticsResponse = {
  daily: Array<{ date: string; value: number }>;
  total: number;
  projected: number;
};

export function BillingDashboardPro() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usage/analytics")
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "analytics_fetch_failed");
        }
        return (await r.json()) as AnalyticsResponse;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "analytics_fetch_failed"));
  }, []);

  const status = useMemo(() => {
    if (!data) return null;
    if (data.projected > 10) return "Alto consumo";
    if (data.projected > 5) return "Moderado";
    return "Normal";
  }, [data]);

  if (error) return <div className="p-6">Error cargando dashboard</div>;
  if (!data) return <div className="p-6">Cargando dashboard...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Facturación</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Gasto actual" value={`$${data.total.toFixed(2)}`} />
        <Card title="Proyección" value={`$${data.projected.toFixed(2)}`} />
        <Card title="Estado" value={status ?? "-"} />
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium">Uso diario</h2>

        <div className="flex h-40 items-end gap-2">
          {data.daily.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center">
              <div
                className="w-full rounded bg-blue-500"
                style={{ height: `${Math.min(100, d.value * 10)}%` }}
              />
              <span className="mt-1 text-[10px] text-zinc-500">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <Alerts projected={data.projected} />
      <UpgradeCTA projected={data.projected} />
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

function Alerts({ projected }: { projected: number }) {
  if (projected < 5) return null;

  return (
    <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-4 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
      <p className="text-sm font-medium">Estás aumentando tu uso</p>
      <p className="text-xs">Podrías gastar ${projected.toFixed(2)} este mes.</p>
    </div>
  );
}

function UpgradeCTA({ projected }: { projected: number }) {
  if (projected < 8) return null;

  return (
    <div className="rounded-lg border border-blue-500 p-4">
      <p className="text-sm font-medium">Conviene pasarte a Pro</p>
      <p className="mb-2 text-xs">Vas a ahorrar dinero con el plan mensual.</p>

      <a
        href="/dashboard/upgrade"
        className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white"
      >
        Ver planes
      </a>
    </div>
  );
}

