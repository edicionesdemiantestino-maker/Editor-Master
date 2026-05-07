"use server";

import { PLAN_LIMITS } from "@/lib/billing/plans";
import { getUserBillingPlanSlug } from "@/services/billing/get-user-plan";

export async function getBillingPlanGate() {
  const plan = await getUserBillingPlanSlug();
  return { plan, limits: PLAN_LIMITS[plan] } as const;
}
