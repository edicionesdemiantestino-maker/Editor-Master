import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractFirstItemPriceId,
  extractMeteredItemId,
  findUserIdByCustomerId,
  upsertSubscription,
} from "@/services/billing/stripe-sync";

export const runtime = "nodejs";

// ── Logging estructurado ──────────────────────────────────────
function log(
  level: "info" | "warn" | "error",
  event: string,
  data?: Record<string, unknown>,
) {
  console[level](
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...data,
    }),
  );
}

// ── Validar metadata obligatoria ─────────────────────────────
function extractUserId(metadata: Record<string, string> | null): string | null {
  const id = metadata?.user_id;
  if (!id || typeof id !== "string" || id.length < 10) return null;
  return id;
}

// ── Marcar evento como procesado o fallido ───────────────────
async function markEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  status: "processed" | "failed",
  errorMessage?: string,
) {
  await admin
    .from("stripe_webhook_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
      ...(errorMessage ? { error_message: errorMessage.slice(0, 500) } : {}),
    })
    .eq("id", eventId);
}

// ── Handler principal ────────────────────────────────────────
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    log("warn", "STRIPE_WEBHOOK_MISSING_SIGNATURE");
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log("error", "STRIPE_WEBHOOK_SECRET_NOT_SET");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const body = await req.text();

  // 1. Validar firma Stripe
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    log("warn", "STRIPE_WEBHOOK_INVALID_SIGNATURE", {
      error: e instanceof Error ? e.message : "unknown",
    });
    return new Response("Webhook signature invalid", { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  log("info", "STRIPE_WEBHOOK_RECEIVED", {
    eventId: event.id,
    eventType: event.type,
  });

  // 2. Idempotencia — insertar "processing" o salir si ya existe
  const { error: insErr } = await admin
    .from("stripe_webhook_events")
    .insert({
      id: event.id,
      status: "processing",
      event_type: event.type,
    });

  if (insErr) {
    // Unique violation (código 23505) = ya procesado
    if (insErr.code === "23505") {
      log("info", "STRIPE_WEBHOOK_DUPLICATE", {
        eventId: event.id,
        eventType: event.type,
      });
      return new Response("ok", { status: 200 });
    }
    // Otro error de DB — loguear pero continuar
    log("error", "STRIPE_WEBHOOK_INSERT_FAILED", {
      eventId: event.id,
      error: insErr.message,
    });
  }

  // 3. Procesar evento
  try {
    switch (event.type) {
      // ── Checkout completado ────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = (session.metadata ?? {}) as Record<string, string>;
        const userId = extractUserId(metadata);

        // Compra única de créditos
        if (session.mode === "payment") {
          const creditsRaw = metadata.credits;
          const credits = Math.floor(Number(creditsRaw ?? 0));

          if (!userId) {
            log("warn", "STRIPE_WEBHOOK_MISSING_USER_ID", {
              eventId: event.id,
              sessionId: session.id,
            });
            break;
          }
          if (!Number.isFinite(credits) || credits <= 0) {
            log("warn", "STRIPE_WEBHOOK_INVALID_CREDITS", {
              eventId: event.id,
              creditsRaw,
            });
            break;
          }

          const { error } = await admin.rpc("add_credits", {
            p_user_id: userId,
            p_amount: credits,
            p_ref: session.id ?? event.id,
          });

          if (error) throw error;

          log("info", "STRIPE_CREDITS_GRANTED", {
            eventId: event.id,
            userId,
            credits,
            sessionId: session.id,
          });
          break;
        }

        // Checkout de suscripción
        const subscriptionId = session.subscription as string | undefined;
        if (!userId || !subscriptionId) {
          log("warn", "STRIPE_WEBHOOK_MISSING_SUBSCRIPTION_DATA", {
            eventId: event.id,
            hasUserId: !!userId,
            hasSubscriptionId: !!subscriptionId,
          });
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription;
        const priceId = extractFirstItemPriceId(sub as any);
        const meteredItemId = extractMeteredItemId(sub as any);
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : (sub.customer as any)?.id ?? null;

        await upsertSubscription({
          supabaseAdmin: admin,
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripeStatus: sub.status,
          currentPeriodStartSec: (sub as any).current_period_start,
          currentPeriodEndSec: (sub as any).current_period_end,
          priceId,
          meteredItemId,
        });

        log("info", "STRIPE_SUBSCRIPTION_CREATED", {
          eventId: event.id,
          userId,
          subscriptionId: sub.id,
          status: sub.status,
        });
        break;
      }

      // ── Suscripción actualizada o cancelada ────────────────
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : (sub.customer as any)?.id;

        if (!customerId) {
          log("warn", "STRIPE_WEBHOOK_MISSING_CUSTOMER_ID", {
            eventId: event.id,
          });
          break;
        }

        const userId = await findUserIdByCustomerId(admin, customerId);
        if (!userId) {
          log("warn", "STRIPE_WEBHOOK_USER_NOT_FOUND", {
            eventId: event.id,
            customerId,
          });
          break;
        }

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
          currentPeriodStartSec: (sub as any).current_period_start,
          currentPeriodEndSec: (sub as any).current_period_end,
          priceId,
          meteredItemId: extractMeteredItemId(sub as any),
        });

        log("info", "STRIPE_SUBSCRIPTION_UPDATED", {
          eventId: event.id,
          userId,
          subscriptionId: sub.id,
          status: sub.status,
          eventType: event.type,
        });
        break;
      }

      // ── Pago de factura exitoso ────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer as any)?.id;

        if (!customerId) break;

        const userId = await findUserIdByCustomerId(admin, customerId);
        if (!userId) break;

        log("info", "STRIPE_INVOICE_PAID", {
          eventId: event.id,
          userId,
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
        });
        break;
      }

      // ── Pago fallido ───────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer as any)?.id;

        if (!customerId) break;

        const userId = await findUserIdByCustomerId(admin, customerId);
        if (!userId) break;

        const { error } = await admin
          .from("user_subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", userId);

        if (error) throw error;

        log("warn", "STRIPE_INVOICE_PAYMENT_FAILED", {
          eventId: event.id,
          userId,
          customerId,
          invoiceId: invoice.id,
        });
        break;
      }

      // ── PaymentIntent exitoso ──────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        log("info", "STRIPE_PAYMENT_INTENT_SUCCEEDED", {
          eventId: event.id,
          paymentIntentId: pi.id,
          amount: pi.amount,
        });
        break;
      }

      default:
        log("info", "STRIPE_WEBHOOK_UNHANDLED_EVENT", {
          eventId: event.id,
          eventType: event.type,
        });
    }

    // 4. Marcar como procesado
    await markEvent(admin, event.id, "processed");

    return new Response("ok", { status: 200 });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "unknown_error";

    log("error", "STRIPE_WEBHOOK_ERROR", {
      eventId: event.id,
      eventType: event.type,
      error: errorMessage,
    });

    // Marcar como fallido para debugging
    await markEvent(admin, event.id, "failed", errorMessage);

    // Retornar 500 para que Stripe reintente
    return NextResponse.json(
      { error: "webhook_processing_failed" },
      { status: 500 },
    );
  }
}