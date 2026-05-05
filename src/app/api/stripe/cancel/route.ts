import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const admin = createSupabaseAdminClient();
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

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({ ok: true });
}

