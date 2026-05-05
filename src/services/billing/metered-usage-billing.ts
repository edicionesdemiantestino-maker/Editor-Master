import type { SupabaseClient } from "@supabase/supabase-js";

import { reportUsageToStripe } from "./report-usage";

type Kind = "inpaint" | "export-print";

export async function maybeReportMeteredUsage(args: {
  supabase: SupabaseClient;
  userId: string;
  kind: Kind;
}): Promise<void> {
  // Fetch limits + subscription period + metered item id.
  const { data: sub, error: subErr } = await args.supabase
    .from("user_subscriptions")
    .select("plan_id, current_period_start, current_period_end, stripe_metered_item_id")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (subErr) throw subErr;

  const periodStart = sub?.current_period_start as string | undefined;
  const periodEnd = sub?.current_period_end as string | undefined;
  const meteredItemId = sub?.stripe_metered_item_id as string | undefined;
  if (!periodStart || !periodEnd) {
    // No active subscription row -> free plan, no metered billing.
    return;
  }

  const { data: limits, error: limitsErr } = await args.supabase.rpc("get_user_limits");
  if (limitsErr || !limits?.[0]) {
    throw new Error("limits_fetch_failed");
  }
  const included =
    args.kind === "inpaint"
      ? Number(limits[0].inpaint_limit ?? 0)
      : Number(limits[0].export_print_limit ?? 0);

  // Total used in current billing period.
  const { data: usedRows, error: usedErr } = await args.supabase
    .from("usage_events")
    .select("cost_units")
    .eq("user_id", args.userId)
    .eq("kind", args.kind)
    .gte("created_at", periodStart)
    .lt("created_at", periodEnd);
  if (usedErr) throw usedErr;
  const totalUsed = (usedRows ?? []).reduce(
    (acc: number, r: any) => acc + Number(r.cost_units ?? 0),
    0,
  );

  const billableTotal = Math.max(0, totalUsed - included);
  if (billableTotal <= 0) return;

  // Cursor (idempotent delta)
  const { data: cursor, error: cursorErr } = await args.supabase
    .from("usage_billing_cursor")
    .select("last_reported_billable_units")
    .eq("user_id", args.userId)
    .eq("kind", args.kind)
    .eq("period_start", periodStart)
    .maybeSingle();
  if (cursorErr) throw cursorErr;
  const already = Number(cursor?.last_reported_billable_units ?? 0);
  const delta = billableTotal - already;
  if (delta <= 0) return;

  // If no metered item configured for plan/subscription, we can't bill overage.
  if (!meteredItemId) return;

  await reportUsageToStripe({
    subscriptionItemId: meteredItemId,
    quantity: delta,
  });

  const { error: upsertErr } = await args.supabase.from("usage_billing_cursor").upsert(
    {
      user_id: args.userId,
      kind: args.kind,
      period_start: periodStart,
      last_reported_billable_units: billableTotal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,kind,period_start" },
  );
  if (upsertErr) throw upsertErr;
}

