import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Stripe node typings restrict apiVersion values; keep as string.
  apiVersion: "2024-06-20" as any,
});

