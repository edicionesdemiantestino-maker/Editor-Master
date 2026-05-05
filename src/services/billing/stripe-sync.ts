import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertSubscription(args: {
  supabaseAdmin: SupabaseClient;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripeStatus: string;
  currentPeriodStartSec: number;
  currentPeriodEndSec: number;
  priceId: string | null;
  meteredItemId?: string | null;
}) {
  if (!args.userId) throw new Error("missing_user_id");

  const planId = await resolvePlanIdByPriceId(args.supabaseAdmin, args.priceId);

  const { error } = await args.supabaseAdmin.from("user_subscriptions").upsert({
    user_id: args.userId,
    plan_id: planId,
    status: normalizeStatus(args.stripeStatus),
    current_period_start: new Date(args.currentPeriodStartSec * 1000).toISOString(),
    current_period_end: new Date(args.currentPeriodEndSec * 1000).toISOString(),
    stripe_customer_id: args.stripeCustomerId,
    stripe_subscription_id: args.stripeSubscriptionId,
    stripe_metered_item_id: args.meteredItemId ?? null,
  });
  if (error) throw error;
}

export async function resolvePlanIdByPriceId(
  supabaseAdmin: SupabaseClient,
  stripePriceId: string | null,
): Promise<string> {
  if (!stripePriceId) return "free";
  const { data, error } = await supabaseAdmin
    .from("billing_plans")
    .select("id")
    .eq("stripe_price_id", stripePriceId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? "free";
}

export async function findUserIdByCustomerId(
  supabaseAdmin: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data?.user_id ?? null;
}

function normalizeStatus(status: string): string {
  if (status === "active" || status === "canceled" || status === "past_due") {
    return status;
  }
  return status.slice(0, 40);
}

export function extractFirstItemPriceId(
  sub: Stripe.Subscription,
): string | null {
  const item = sub.items.data[0];
  const id = item?.price?.id;
  return typeof id === "string" ? id : null;
}

export function extractMeteredItemId(sub: Stripe.Subscription): string | null {
  const metered = sub.items.data.find((i) => i.price?.usage_type === "metered");
  const id = metered?.id;
  return typeof id === "string" ? id : null;
}

