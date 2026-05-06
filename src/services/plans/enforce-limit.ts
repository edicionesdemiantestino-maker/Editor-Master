import { getUserPlan } from "./plan-service";

export async function enforceLimit(
  type: "brand_kits" | "export" | "inpaint",
  currentCount: number,
) {
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

