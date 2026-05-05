import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const { newPriceId } = (await req.json().catch(() => ({}))) as {
    newPriceId?: string;
  };
  if (!newPriceId || typeof newPriceId !== "string") {
    return NextResponse.json({ error: "missing_new_price_id" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: plan, error: planErr } = await admin
    .from("billing_plans")
    .select("stripe_price_id")
    .eq("stripe_price_id", newPriceId)
    .maybeSingle();
  if (planErr) return NextResponse.json({ error: "plan_lookup_failed" }, { status: 500 });
  if (!plan) return NextResponse.json({ error: "unknown_price_id" }, { status: 400 });

  const { data: subRow, error: subErr } = await admin
    .from("user_subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (subErr) return NextResponse.json({ error: "subscription_lookup_failed" }, { status: 500 });
  const subscriptionId = subRow?.stripe_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 400 });
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) return NextResponse.json({ error: "subscription_item_missing" }, { status: 500 });

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "create_prorations",
  });

  return NextResponse.json({ ok: true });
}

