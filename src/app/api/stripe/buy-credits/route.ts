import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/server";
import { getSiteOrigin } from "@/lib/supabase/env";
import { requireServerUser } from "@/lib/supabase/require-server-user";

export const runtime = "nodejs";

const CREDIT_PACKS = {
  small: { priceUsd: 5_00, credits: 100 },
  medium: { priceUsd: 15_00, credits: 500 },
  large: { priceUsd: 30_00, credits: 1200 },
} as const;

type PackKey = keyof typeof CREDIT_PACKS;

export async function POST(req: Request) {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as { pack?: string };
  const pack = body.pack as PackKey | undefined;
  if (!pack || !(pack in CREDIT_PACKS)) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }

  const selected = CREDIT_PACKS[pack];
  const origin = getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: auth.user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `${selected.credits} credits` },
          unit_amount: selected.priceUsd,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard/usage?credits=success`,
    cancel_url: `${origin}/dashboard/usage?credits=canceled`,
    metadata: {
      user_id: auth.userId,
      credits: String(selected.credits),
      pack,
    },
  });

  return NextResponse.json({ url: session.url });
}

