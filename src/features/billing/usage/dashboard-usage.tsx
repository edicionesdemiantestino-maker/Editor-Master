"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import type { UserPlan } from "@/services/plans/plan-service";

import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { PremiumStat } from "@/components/ui/premium-stat";
import { CreditsCard } from "@/features/billing/credits/credits-card";
import { BuyCreditsButton } from "@/features/billing/credits/buy-credits-button";
import { BillingSettingsCard } from "@/features/billing/credits/billing-settings-card";
import { useDashboardCredits } from "@/features/billing/credits/use-dashboard-credits";
import { usePlan } from "@/hooks/use-plan";
import { useUsageDashboard } from "@/hooks/use-usage-dashboard";

import { LimitMeter } from "./limit-meter";
import { buildTimelineChartData, UsageChart } from "./usage-chart";
import { UsageEventsForecast } from "./usage-events-forecast";
import { getUsageAlerts } from "./usage-alerts";

const ROLLING_DAYS = 30;

function monthlyProjectionFromRolling(totals: number) {
  const avg = totals / ROLLING_DAYS;
  return Math.round(avg * ROLLING_DAYS);
}

function calendarMonthProjection(mtd: number): number {
  const now = new Date();
  const dom = now.getDate();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (dom <= 0) return mtd;
  return Math.round((mtd / dom) * dim);
}

export function DashboardUsage({
  plan: planOverride,
}: {
  plan?: UserPlan | null;
} = {}) {
  const router = useRouter();
  const { data, loading: loadingUsage } = useUsageDashboard();
  const { data: creditsDash } = useDashboardCredits();
  const { plan: planHook, loading: loadingPlan } = usePlan();
  const plan = planOverride ?? planHook;

  const loading = loadingUsage || loadingPlan;

  const chartData = useMemo(
    () => (data?.daily?.length ? buildTimelineChartData(data.daily) : []),
    [data],
  );

  const projectedExportsRolling = data
    ? monthlyProjectionFromRolling(data.totals.exports)
    : 0;
  const projectedInpaintsRolling = data
    ? monthlyProjectionFromRolling(data.totals.inpaints)
    : 0;

  const projectedExportsMonth = data
    ? calendarMonthProjection(data.month_to_date.exports)
    : 0;
  const projectedInpaintsMonth = data
    ? calendarMonthProjection(data.month_to_date.inpaints)
    : 0;

  if (loading) {
    return (
      <GlassCard className="p-10">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
        <p className="mt-4 text-center text-sm text-zinc-400">Cargando uso…</p>
      </GlassCard>
    );
  }

  if (!data || !plan) {
    return (
      <GlassCard className="border-red-500/30 bg-red-500/5 p-6">
        <p className="text-sm text-red-200">
          No se pudo cargar el panel de uso. Volvé a iniciar sesión o probá más tarde.
        </p>
      </GlassCard>
    );
  }

  const alerts = getUsageAlerts(data, plan);
  const daysLeft = creditsDash?.prediction?.daysLeft ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <CreditsCard />
        <GlassCard className="p-5">
          <div className="text-sm font-medium text-zinc-200">Tip</div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Si te quedás sin créditos, el editor bloquea la acción al instante y te redirige a
            comprar más (Stripe Checkout).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <BuyCreditsButton pack="small" />
            <BuyCreditsButton pack="medium" />
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-5">
          <div className="text-sm font-medium text-zinc-200">Proyección</div>
          <p className="mt-2 text-xs text-zinc-500">
            {daysLeft == null
              ? "Necesitamos más uso reciente para estimar días restantes."
              : `A este ritmo, te quedan ~${daysLeft} días.`}
          </p>
        </GlassCard>
        <BillingSettingsCard />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Panel de uso</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Plan <span className="font-medium text-zinc-200">{plan.name}</span>
            {" · "}últimos {ROLLING_DAYS} días
          </p>
        </div>
        <GradientButton type="button" onClick={() => router.push("/dashboard/upgrade")}>
          Upgrade
        </GradientButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LimitMeter
          label="Exports (cuota diaria)"
          used={data.quota_today.exports}
          limit={plan.export_print_limit}
        />
        <LimitMeter
          label="Inpaints (cuota diaria)"
          used={data.quota_today.inpaints}
          limit={plan.inpaint_limit}
        />
      </div>

      <GlassCard className="p-5 md:p-6">
        <h3 className="mb-1 text-sm font-semibold tracking-wide text-white">Uso en el tiempo</h3>
        <p className="mb-4 text-xs text-zinc-500">Exports vs inpaints por día.</p>
        {chartData.length ? (
          <UsageChart data={chartData} />
        ) : (
          <p className="py-14 text-center text-sm text-zinc-500">Sin eventos en este periodo.</p>
        )}
      </GlassCard>

      <UsageEventsForecast />

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        initial={false}
      >
        <PremiumStat label={`Exports (${ROLLING_DAYS}d)`} value={data.totals.exports} />
        <PremiumStat label={`Inpaints (${ROLLING_DAYS}d)`} value={data.totals.inpaints} />
        <PremiumStat label="Exports (mes calendario)" value={data.month_to_date.exports} />
        <PremiumStat label="Inpaints (mes calendario)" value={data.month_to_date.inpaints} />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-5">
          <div className="text-sm font-medium text-zinc-200">Proyección mensual (ritmo 30d)</div>
          <div className="mt-3 text-lg font-semibold tabular-nums text-white">
            {projectedExportsRolling}{" "}
            <span className="text-sm font-normal text-zinc-500">exports</span>
            {" · "}
            {projectedInpaintsRolling}{" "}
            <span className="text-sm font-normal text-zinc-500">inpaints</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Equivale a tu total de la ventana móvil de {ROLLING_DAYS} días (media ×{" "}
            {ROLLING_DAYS}).
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="text-sm font-medium text-zinc-200">Proyección fin de mes</div>
          <div className="mt-3 text-lg font-semibold tabular-nums text-white">
            {projectedExportsMonth}{" "}
            <span className="text-sm font-normal text-zinc-500">exports</span>
            {" · "}
            {projectedInpaintsMonth}{" "}
            <span className="text-sm font-normal text-zinc-500">inpaints</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Extrapolación desde el uso del mes actual (Supabase RPC).
          </p>
        </GlassCard>
      </div>

      {alerts.length > 0 ? (
        <motion.div layout className="space-y-2">
          {alerts.map((a) => (
            <motion.div
              key={a}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-md"
            >
              {a}
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
