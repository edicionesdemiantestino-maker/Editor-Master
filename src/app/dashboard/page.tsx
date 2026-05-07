import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardUsageTimeseries } from "@/components/dashboard/dashboard-usage-timeseries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { PLANS } from "@/lib/billing/pricing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBillingPlanSlugForUser } from "@/services/billing/get-user-plan";

export default async function DashboardHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fdashboard&message=required");
  }

  const [{ data: limitsRows, error: limErr }, { data: usageRows }] = await Promise.all([
    supabase.rpc("get_user_limits"),
    supabase.rpc("get_monthly_usage", { uid: user.id }),
  ]);

  if (limErr || !limitsRows?.length) {
    redirect("/login?message=required");
  }

  const planId = String((limitsRows[0] as { plan_id?: string }).plan_id ?? "free") as keyof typeof PLANS;
  const planKey: keyof typeof PLANS = planId in PLANS ? planId : "free";

  const productPlan = await getBillingPlanSlugForUser(supabase, user.id);
  const productLimits = PLAN_LIMITS[productPlan];

  const usageMap = Object.fromEntries((usageRows ?? []).map((u: { kind: string }) => [u.kind, u]));
  const inpaintUsed = Number((usageMap.inpaint as { total_quantity?: number } | undefined)?.total_quantity ?? 0);
  const exportUsed = Number(
    (usageMap["export-print"] as { total_quantity?: number } | undefined)?.total_quantity ?? 0,
  );
  const included = PLANS[planKey].monthlyIncluded;

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const periodEndMs = sub?.current_period_end
    ? new Date(sub.current_period_end as string).getTime()
    : 0;
  const periodOk = periodEndMs > Date.now();
  const st = sub?.status as string | undefined;

  let statusLabel = "Activo";
  let statusClass = "text-emerald-400";
  if (planKey === "free" || !periodOk) {
    statusLabel = "Plan Free";
    statusClass = "text-zinc-300";
  } else if (st === "past_due") {
    statusLabel = "Pago pendiente";
    statusClass = "text-amber-400";
  } else if (st === "canceled" || st === "unpaid" || st === "incomplete_expired") {
    statusLabel = "Inactivo";
    statusClass = "text-red-400";
  }

  const planLabel =
    planKey === "free" ? "Free" : planKey === "pro" ? "Pro" : planKey === "business" ? "Business" : planKey;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Resumen de uso este mes · plan y estado de suscripción Stripe.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/usage"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-100 backdrop-blur hover:bg-white/10"
          >
            Uso detallado
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-transparent bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20"
          >
            Ver planes
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Uso mensual (cantidad)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500">Inpaint</p>
              <p className="text-2xl font-bold tabular-nums text-white">
                {inpaintUsed} / {included.inpaint}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Export print</p>
              <p className="text-2xl font-bold tabular-nums text-white">
                {exportUsed} / {included["export-print"]}
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              Límites diarios del plan: inpaint {String((limitsRows[0] as { inpaint_limit?: number }).inpaint_limit ?? "—")}{" "}
              · export{" "}
              {String((limitsRows[0] as { export_print_limit?: number }).export_print_limit ?? "—")}
            </p>
            <p className="text-xs text-zinc-500">
              Tope producto exports/día: <span className="text-zinc-300">{productLimits.maxExportsPerDay}</span> ·
              proyectos máx.:{" "}
              <span className="text-zinc-300">
                {Number.isFinite(productLimits.maxProjects) ? productLimits.maxProjects : "∞"}
              </span>{" "}
              · Brand Kit: {productLimits.brandKit ? "sí" : "no"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize text-white">{planLabel}</p>
            <p className="mt-1 text-xs text-zinc-500">Producto: {productPlan}</p>
            <p className="mt-2 text-sm text-zinc-400">
              Incluido este mes según configuración · ver{" "}
              <Link href="/dashboard/upgrade" className="text-indigo-300 underline decoration-indigo-300/40">
                upgrade
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${statusClass}`}>{statusLabel}</p>
            <p className="mt-2 text-sm text-zinc-400">
              Proyectos:{" "}
              <Link href="/dashboard/projects" className="text-indigo-300 underline decoration-indigo-300/40">
                abrir lista
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uso en el tiempo (API agregada)</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardUsageTimeseries />
        </CardContent>
      </Card>

      {periodOk && sub?.current_period_end ? (
        <p className="text-center text-xs text-zinc-500">
          Renovación próx.: {new Date(sub.current_period_end as string).toLocaleString("es")}
        </p>
      ) : null}
    </div>
  );
}
