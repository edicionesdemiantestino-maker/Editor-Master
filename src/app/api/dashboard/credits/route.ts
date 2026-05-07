import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { checkUsageAlerts } from "@/services/billing/alerts-service";
import { predictUsage } from "@/services/billing/usage-prediction";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const url = new URL(req.url);
  const daysRaw = url.searchParams.get("days");
  const days = Math.min(365, Math.max(1, Math.floor(Number(daysRaw ?? 30))));

  const supabase = await createServerClient();

  const [{ data: balRow, error: balErr }, { data: daily, error: dailyErr }] =
    await Promise.all([
      supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", auth.userId)
        .maybeSingle(),
      // Prefer matview-backed RPC; fall back to raw aggregation if missing.
      supabase
        .rpc("get_usage_daily_agg", { p_days: days })
        .then((r) => (r.error ? supabase.rpc("credits_usage_by_day", { p_days: days }) : r)),
    ]);

  if (balErr || dailyErr) {
    console.error("dashboard_credits_failed", balErr ?? dailyErr);
    return NextResponse.json({ error: "credits_failed" }, { status: 500 });
  }

  const dailyUsage = (daily ?? []) as Array<{ day: string; total_credits: number }>;
  const usageLast30 = dailyUsage.reduce(
    (acc, r) => acc + Number(r.total_credits ?? 0),
    0,
  );

  const prediction = await predictUsage(auth.userId);
  const alerts = await checkUsageAlerts({ userId: auth.userId, prediction });

  return NextResponse.json({
    balance: Number(balRow?.balance ?? 0),
    usage: {
      usage_last_30_days: usageLast30,
      daily_usage: dailyUsage.map((r) => ({
        day: String(r.day).slice(0, 10),
        total: Number(r.total_credits ?? 0),
      })),
    },
    prediction: {
      daysLeft: prediction.daysLeft,
      monthlyProjection: prediction.monthlyProjection,
    },
    alerts,
  });
}

