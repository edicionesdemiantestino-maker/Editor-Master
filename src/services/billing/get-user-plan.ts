import type { SupabaseClient } from "@supabase/supabase-js";

import {
  coerceBillingPlanSlug,
  type BillingPlanSlug,
} from "@/lib/billing/plans";
import { createServerClient } from "@/lib/supabase/server";

function isSubscriptionRowActive(row: {
  status?: string | null;
  current_period_end?: string | null;
}): boolean {
  if (!row?.status || row.status !== "active") return false;
  if (!row.current_period_end) return false;
  return new Date(row.current_period_end).getTime() > Date.now();
}

/**
 * Plan comercial del usuario (free / pro / business) según `user_subscriptions` + vigencia.
 * No usa columna `plan` (no existe): usa `plan_id` → `billing_plans.id`.
 */
export async function getUserBillingPlanSlug(): Promise<BillingPlanSlug> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "free";

  return getBillingPlanSlugForUser(supabase, user.id);
}

export async function getBillingPlanSlugForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<BillingPlanSlug> {
  const { data: sub, error } = await supabase
    .from("user_subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !sub || !isSubscriptionRowActive(sub)) {
    return "free";
  }

  return coerceBillingPlanSlug(sub.plan_id as string);
}
