import { NextResponse } from "next/server";

import { PLAN_LIMITS } from "@/lib/billing/plans";
import { createServerClient } from "@/lib/supabase/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { getBillingPlanSlugForUser } from "@/services/billing/get-user-plan";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const url = new URL(req.url);
  const daysRaw = url.searchParams.get("days");
  const days = Math.min(90, Math.max(7, Math.floor(Number(daysRaw ?? 30))));

  // Use SSR client (RLS) so auth.uid() works in RPC.
  const supabase = await createServerClient();

  const productPlan = await getBillingPlanSlugForUser(supabase, auth.userId);

  const { data, error } = await supabase.rpc("get_usage_timeseries", { days });
  if (error) {
    console.error("dashboard_usage_rpc_error", error);
    return NextResponse.json({ error: "usage_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    day: string;
    inpaint_used: number;
    export_print_used: number;
    total_cost_usd: number;
  }>;

  return NextResponse.json({
    days,
    plan: productPlan,
    planProductLimits: PLAN_LIMITS[productPlan],
    usage: rows.map((r) => ({
      date: r.day.slice(0, 10),
      inpaint_count: Number(r.inpaint_used ?? 0),
      export_count: Number(r.export_print_used ?? 0),
      total_cost: Number(r.total_cost_usd ?? 0),
    })),
  });
}

