import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { getSiteOrigin } from "@/lib/supabase/env";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const admin = createSupabaseAdminClient();

  const body = (await req.json().catch(() => ({}))) as {
    priceId?: string;
    planId?: string;
    /** Alias de `planId` para el front (`pro` | `business`). */
    plan?: string;
  };

  let resolvedPlanId =
    typeof body.planId === "string" && body.planId.trim().length > 0
      ? body.planId.trim()
      : typeof body.plan === "string"
        ? body.plan.trim().toLowerCase()
        : "";

  if (resolvedPlanId === "free") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  let plan:
    | { id: string; stripe_price_id: string | null; stripe_metered_price_id: string | null }
    | null = null;

  if (resolvedPlanId.length > 0) {
    const { data, error } = await admin
      .from("billing_plans")
      .select("id, stripe_price_id, stripe_metered_price_id")
      .eq("id", resolvedPlanId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "plan_lookup_failed" }, { status: 500 });
    }
    plan = data as any;
  } else if (typeof body.priceId === "string" && body.priceId.trim().length > 0) {
    // Backwards compatible: accept raw base priceId (validated against DB).
    const { data, error } = await admin
      .from("billing_plans")
      .select("id, stripe_price_id, stripe_metered_price_id")
      .eq("stripe_price_id", body.priceId.trim())
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "plan_lookup_failed" }, { status: 500 });
    }
    plan = data as any;
  } else {
    return NextResponse.json({ error: "missing_plan" }, { status: 400 });
  }

  if (!plan) {
    return NextResponse.json({ error: "unknown_plan" }, { status: 400 });
  }
  if (!plan.stripe_price_id) {
    return NextResponse.json({ error: "plan_not_configured" }, { status: 400 });
  }

  const origin = getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: auth.user.email ?? undefined,
    line_items: [
      { price: plan.stripe_price_id as string, quantity: 1 },
      ...(plan.stripe_metered_price_id
        ? [{ price: plan.stripe_metered_price_id as string }]
        : []),
    ],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?canceled=1`,
    metadata: {
      user_id: auth.userId,
      plan_id: plan.id,
    },
  });

  return NextResponse.json({ url: session.url });
}

