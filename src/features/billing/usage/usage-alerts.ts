import type { UsageDashboardPayload } from "@/app/actions/usage-dashboard";
import type { UserPlan } from "@/services/plans/plan-service";

/** Alertas basadas en datos reales (cuota hoy, ritmo 30d y totales del periodo). */
export function getUsageAlerts(
  data: UsageDashboardPayload,
  plan: UserPlan,
): string[] {
  const alerts: string[] = [];

  const maxEx = Math.max(0, plan.export_print_limit);
  const maxIn = Math.max(0, plan.inpaint_limit);

  const qEx = data.quota_today.exports;
  const qIn = data.quota_today.inpaints;

  if (maxEx > 0 && qEx >= maxEx * 0.8) {
    alerts.push("Estás cerca del límite diario de exports.");
  }

  if (maxIn > 0 && qIn >= maxIn * 0.8) {
    alerts.push("Estás cerca del límite diario de inpaints.");
  }

  const avgEx30 = data.totals.exports / 30;
  const avgIn30 = data.totals.inpaints / 30;

  if (maxEx > 0 && avgEx30 >= maxEx * 0.8) {
    alerts.push(
      "Tu media diaria de exports (últimos 30 días) roza el tope diario del plan.",
    );
  }

  if (maxIn > 0 && avgIn30 >= maxIn * 0.8) {
    alerts.push(
      "Tu media diaria de inpaints (últimos 30 días) roza el tope diario del plan.",
    );
  }

  /* Regla solicitada: totales 30d vs límite por día (nombre de plan equivale a export_print_limit / inpaint_limit). */
  if (maxEx > 0 && data.totals.exports > maxEx * 0.8) {
    alerts.push("Muchos exports registrados en la ventana de 30 días.");
  }

  if (maxIn > 0 && data.totals.inpaints > maxIn * 0.8) {
    alerts.push("Uso alto de inpaint en los últimos 30 días.");
  }

  return [...new Set(alerts)];
}
