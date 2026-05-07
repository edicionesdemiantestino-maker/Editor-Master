import { randomUUID } from "node:crypto";

import { stripe } from "@/lib/stripe/server";
import { createServerClient } from "@/lib/supabase/server";
import { logStructuredLine } from "@/lib/observability/structured-log";

const AUTO_TOPUP_MIN_INTERVAL_MS = 10 * 60_000; // 10 minutes

function priceUsdCentsForCredits(credits: number): number {
  // Assumption: $5 per 100 credits.
  const unit = 5_00;
  return Math.max(unit, Math.round((credits / 100) * unit));
}

export async function maybeTriggerAutoTopUp(userId: string): Promise<void> {
  const supabase = await createServerClient();

  const [{ data: balRow }, { data: settings }, { data: subRow }] =
    await Promise.all([
      supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("billing_settings")
        .select(
          "auto_topup_enabled, auto_topup_threshold, auto_topup_amount, last_auto_topup_at, last_auto_topup_ref",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const balance = Number((balRow as any)?.balance ?? 0);
  const enabled = Boolean((settings as any)?.auto_topup_enabled ?? false);
  const threshold = Number((settings as any)?.auto_topup_threshold ?? 10);
  const amountCredits = Number((settings as any)?.auto_topup_amount ?? 100);
  const lastAt = (settings as any)?.last_auto_topup_at as string | null | undefined;

  if (!enabled) return;
  if (!Number.isFinite(balance) || balance > threshold) return;
  if (!Number.isFinite(amountCredits) || amountCredits <= 0) return;

  if (lastAt) {
    const lastMs = new Date(lastAt).getTime();
    if (Number.isFinite(lastMs) && Date.now() - lastMs < AUTO_TOPUP_MIN_INTERVAL_MS) {
      return;
    }
  }

  const customerId = (subRow as any)?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    logStructuredLine(
      {
        service: "actions/project-persistence",
        userId,
        event: "auto_topup_skipped",
        code: "missing_stripe_customer",
      },
      "warn",
    );
    return;
  }

  const ref = `auto_topup:${randomUUID()}`;

  // Try automated charge (requires saved payment method). If it fails, we just log.
  try {
    const amountCents = priceUsdCentsForCredits(amountCredits);
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customerId,
      confirm: true,
      off_session: true,
      metadata: {
        user_id: userId,
        credits: String(amountCredits),
        auto_topup: "true",
        ref,
      },
    });

    await supabase
      .from("billing_settings")
      .upsert(
        {
          user_id: userId,
          last_auto_topup_at: new Date().toISOString(),
          last_auto_topup_ref: String(pi.id).slice(0, 200),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id" },
      );

    // Credits are only added on webhook: `checkout.session.completed` (payment) in this system.
    // For PaymentIntent automation, webhook must handle payment_intent.succeeded too (future work).
    logStructuredLine(
      {
        service: "actions/project-persistence",
        userId,
        event: "auto_topup_payment_intent_created",
        code: String(pi.status ?? "unknown").slice(0, 80),
      },
      "info",
    );
  } catch (e) {
    logStructuredLine(
      {
        service: "actions/project-persistence",
        userId,
        event: "auto_topup_failed",
        code: e instanceof Error ? e.name : "unknown",
      },
      "warn",
    );
  }
}

