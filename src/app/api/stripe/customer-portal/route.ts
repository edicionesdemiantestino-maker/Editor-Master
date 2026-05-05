import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { getSiteOrigin } from "@/lib/supabase/env";
import { requireServerUser } from "@/lib/supabase/require-server-user";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "subscription_lookup_failed" }, { status: 500 });
  }

  const customerId = data?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getSiteOrigin()}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}

