import { stripe } from "@/lib/stripe/server";

export async function reportUsageToStripe(args: {
  subscriptionItemId: string;
  quantity: number;
}) {
  if (args.quantity <= 0) return;
  await stripe.subscriptionItems.createUsageRecord(args.subscriptionItemId, {
    quantity: args.quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: "increment",
  });
}

