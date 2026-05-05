import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractFirstItemPriceId,
  extractMeteredItemId,
  findUserIdByCustomerId,
  upsertSubscription,
} from "@/services/billing/stripe-sync";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Webhook error", { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Idempotency: skip if event already processed
  const { error: insErr } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id });
  if (insErr) {
    // Unique violation -> already processed
    return new Response("ok", { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session?.metadata?.user_id as string | undefined;
        const subscriptionId = session?.subscription as string | undefined;
        if (!userId || !subscriptionId) break;

        const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
        const priceId = extractFirstItemPriceId(sub as any);
        const meteredItemId = extractMeteredItemId(sub as any);
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

        await upsertSubscription({
          supabaseAdmin: admin,
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripeStatus: sub.status,
          currentPeriodStartSec: Number(sub.current_period_start ?? 0),
          currentPeriodEndSec: Number(sub.current_period_end ?? 0),
          priceId,
          meteredItemId,
        });

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        const userId = await findUserIdByCustomerId(admin, customerId);
        if (!userId) break;

        const priceId =
          typeof sub.items?.data?.[0]?.price?.id === "string"
            ? sub.items.data[0].price.id
            : null;

        await upsertSubscription({
          supabaseAdmin: admin,
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripeStatus: sub.status,
          currentPeriodStartSec: sub.current_period_start,
          currentPeriodEndSec: sub.current_period_end,
          priceId,
          meteredItemId: extractMeteredItemId(sub as any),
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        console.warn("stripe_invoice_payment_failed", customerId);

        const userId = await findUserIdByCustomerId(admin, customerId);
        if (!userId) break;

        const { error } = await admin
          .from("user_subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", userId);
        if (error) throw error;

        break;
      }
    }
  } catch (e) {
    console.error("stripe_webhook_handler_failed", e);
    return NextResponse.json({ error: "webhook_failed" }, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

