import { PLAN_LIMITS } from "@/lib/billing/plans";
import { getUserBillingPlanSlug } from "@/services/billing/get-user-plan";

import { getUserPlan } from "./plan-service";

export async function enforceLimit(
  type: "brand_kits" | "export" | "inpaint",
  currentCount: number,
) {
  const slug = await getUserBillingPlanSlug();
  if (type === "brand_kits") {
    if (!PLAN_LIMITS[slug].brandKit) {
      throw new Error("brand_kit_requires_upgrade");
    }
  }

  const plan = await getUserPlan();
  if (!plan) return;

  if (type === "brand_kits" && currentCount >= plan.max_brand_kits) {
    throw new Error("limit_brand_kits");
  }

  if (type === "export" && currentCount >= plan.export_print_limit) {
    throw new Error("limit_exports");
  }

  if (type === "inpaint" && currentCount >= plan.inpaint_limit) {
    throw new Error("limit_inpaint");
  }
}

