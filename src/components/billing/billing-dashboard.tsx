"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertBadge } from "./alert-badge";
import { AutoTopupCard } from "./auto-topup-card";
import { CreditBalanceCard } from "./credit-balance-card";
import { PredictionCard } from "./prediction-card";
import type { BillingUsagePoint } from "./usage-chart";
import { UsageChart } from "./usage-chart";

type DashboardCreditsPayload = {
  balance: number;
  usage: {
    usage_last_30_days: number;
    daily_usage: Array<{ day: string; total: number }>;
  };
  prediction?: { daysLeft: number | null; monthlyProjection: number };
  alerts?: { lowBalance: boolean; risk: boolean };
};

function weekdayShort(isoDay: string): string {
  try {
    const dt = new Date(`${isoDay}T00:00:00Z`);
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(dt);
  } catch {
    return isoDay.slice(5);
  }
}

export default function BillingDashboard() {
  const [data, setData] = useState<DashboardCreditsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/dashboard/credits?days=30", { credentials: "include" })
      .then(async (r) => {
        const j = (await r.json()) as DashboardCreditsPayload & { error?: string };
        if (!r.ok) throw new Error(j.error ?? String(r.status));
        return j as DashboardCreditsPayload;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo<BillingUsagePoint[]>(() => {
    const daily = data?.usage?.daily_usage ?? [];
    const points = daily.slice(-14).map((r) => ({
      day: weekdayShort(r.day),
      usage: Number(r.total ?? 0),
    }));

    const avgDaily =
      data?.prediction?.monthlyProjection != null
        ? data.prediction.monthlyProjection / 30
        : points.length
          ? points.reduce((a, b) => a + b.usage, 0) / points.length
          : 0;

    return points.map((p) => ({
      ...p,
      projected: Math.round(avgDaily),
    }));
  }, [data]);

  const alertStatus: "ok" | "low" | "critical" = (() => {
    const low = Boolean(data?.alerts?.lowBalance);
    const risk = Boolean(data?.alerts?.risk);
    const daysLeft = data?.prediction?.daysLeft;
    if (low && (data?.balance ?? 0) <= 10) return "critical";
    if (daysLeft != null && daysLeft <= 1) return "critical";
    if (low || risk) return "low";
    return "ok";
  })();

  return (
    <div className="min-h-[calc(100vh-1px)] bg-[#0b0f1a]">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_40%_80%,rgba(244,114,182,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="transition-opacity duration-500" style={{ opacity: loading ? 0.75 : 1 }}>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Billing
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Stripe-level credits dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Real usage, projection, alerts, and auto top-up — powered by your existing{" "}
              <code className="text-white/70">/api/dashboard/credits</code>.
            </p>
          </div>
          <div className="pt-1">
            <AlertBadge status={alertStatus} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <CreditBalanceCard balance={data?.balance ?? null} />
          <PredictionCard
            daysLeft={data?.prediction?.daysLeft ?? null}
            monthlyProjection={data?.prediction?.monthlyProjection ?? null}
          />
        </div>

        <div className="mt-4">
          <UsageChart data={chartData} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AutoTopupCard />
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-200 hover:scale-[1.01]">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Notes
            </div>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <p>
                - Solid line: actual daily credits usage (last ~14 points)
              </p>
              <p>
                - Dashed line: projected daily usage (avg)
              </p>
              <p className="text-xs text-white/45">
                This page is dark-only by design (fintech style). No existing flows were refactored.
              </p>
            </div>
          </div>
        </div>

        {!loading && !data ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
            Couldn’t load billing data. Please re-login and retry.
          </div>
        ) : null}
      </div>
    </div>
  );
}

