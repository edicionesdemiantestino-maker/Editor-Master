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
    .select("stripe_customer_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "subscription_lookup_failed" }, { status: 500 });
  }

  const customerId = data?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ invoices: [] });
  }

  const invoices = await stripe.invoices.list({ customer: customerId, limit: 5 });

  return NextResponse.json({
    invoices: invoices.data.map((i) => ({
      amount: i.amount_paid,
      date: i.created,
      url: i.hosted_invoice_url,
    })),
  });
}

