import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("user_subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status, current_period_end")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "subscription_lookup_failed" }, { status: 500 });
  }

  if (!data?.stripe_customer_id) {
    return NextResponse.json({ subscription: null });
  }

  // Prefer direct retrieve if we have subscription id; otherwise fall back to list by customer.
  const sub = data.stripe_subscription_id
    ? await stripe.subscriptions.retrieve(data.stripe_subscription_id)
    : (await stripe.subscriptions.list({ customer: data.stripe_customer_id, limit: 1 }))
        .data[0] ?? null;

  if (!sub) {
    return NextResponse.json({ subscription: null });
  }

  return NextResponse.json({
    subscription: {
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
    },
  });
}

