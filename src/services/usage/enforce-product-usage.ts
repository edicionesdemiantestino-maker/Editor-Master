import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingPlanSlugForUser } from "@/services/billing/get-user-plan";

/** Hard stop comercial (antes de cuotas RPC / Stripe). */
export class ProductUsageBlockedError extends Error {
  constructor(
    message: string,
    public readonly code: "upgrade_required" | "feature_not_available",
    public readonly kind: string,
  ) {
    super(message);
    this.name = "ProductUsageBlockedError";
  }
}

export async function assertInpaintProductAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const plan = await getBillingPlanSlugForUser(supabase, userId);
  if (plan === "free") {
    throw new ProductUsageBlockedError(
      "inpaint_requires_paid_plan",
      "upgrade_required",
      "inpaint",
    );
  }
}

export async function assertAiTextProductAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const plan = await getBillingPlanSlugForUser(supabase, userId);
  if (plan === "free") {
    throw new ProductUsageBlockedError(
      "ai_text_requires_paid_plan",
      "upgrade_required",
      "ai-text",
    );
  }
}
