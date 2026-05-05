import Stripe from "stripe";

let cached: Stripe | null = null;

function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("stripe_not_configured");
  return key;
}

export function getStripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(getStripeKey(), {
    // Stripe node typings restrict apiVersion values; keep as string.
    apiVersion: "2024-06-20" as any,
  });
  return cached;
}

// Backwards-compatible export: safe at import time, throws only if used without config.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as any)[prop];
  },
}) as any;

