"use client";

/**
 * Checkout Stripe real (subscription). Requiere sesión válida (`requireServerUser` en API).
 */
export async function startSubscriptionCheckout(planId: "pro" | "business"): Promise<boolean> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: planId }),
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

  if (res.ok && data.url) {
    window.location.assign(data.url);
    return true;
  }

  console.error("stripe_checkout_failed", data.error ?? res.status);
  return false;
}
