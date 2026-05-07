import type { SupabaseClient } from "@supabase/supabase-js";

import { PLAN_LIMITS } from "@/lib/billing/plans";
import { getBillingPlanSlugForUser } from "@/services/billing/get-user-plan";

export async function checkUsageLimit(
  supabase: SupabaseClient,
  kind: "inpaint" | "export-print",
): Promise<{ allowed: boolean; used: number; limit: number; planId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const productSlug =
    user?.id ? await getBillingPlanSlugForUser(supabase, user.id) : "free";

  const { data: limits, error: limitsErr } = await supabase.rpc("get_user_limits");
  if (limitsErr || !limits?.[0]) {
    throw new Error("limits_fetch_failed");
  }

  const dbLimit =
    kind === "inpaint"
      ? Number(limits[0].inpaint_limit ?? 0)
      : Number(limits[0].export_print_limit ?? 0);

  const limit =
    kind === "export-print"
      ? Math.min(dbLimit, PLAN_LIMITS[productSlug].maxExportsPerDay)
      : dbLimit;

  const { data: used, error: usedErr } = await supabase.rpc("get_usage_today", {
    p_kind: kind,
  });
  if (usedErr) {
    throw new Error("usage_fetch_failed");
  }

  const usedN = Number(used ?? 0);
  return {
    allowed: usedN < limit,
    used: usedN,
    limit,
    planId: String(limits[0].plan_id ?? "free"),
  };
}

