export type BillingPlanSlug = "free" | "pro" | "business";

export type PlanProductLimits = {
  maxProjects: number;
  maxExportsPerDay: number;
  brandKit: boolean;
};

/** Límites de producto (capa adicional sobre `billing_plans` / RPC). Backend debe aplicarlos siempre. */
export const PLAN_LIMITS: Record<BillingPlanSlug, PlanProductLimits> = {
  free: {
    maxProjects: 3,
    maxExportsPerDay: 3,
    brandKit: false,
  },
  pro: {
    maxProjects: 50,
    maxExportsPerDay: 20,
    brandKit: true,
  },
  business: {
    maxProjects: Number.POSITIVE_INFINITY,
    maxExportsPerDay: 100,
    brandKit: true,
  },
};

export function coerceBillingPlanSlug(id: string | null | undefined): BillingPlanSlug {
  const s = String(id ?? "free").toLowerCase();
  if (s === "pro") return "pro";
  if (s === "business") return "business";
  return "free";
}
