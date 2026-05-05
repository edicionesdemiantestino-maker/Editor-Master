import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";

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
    usage: rows.map((r) => ({
      date: r.day,
      inpaint_count: Number(r.inpaint_used ?? 0),
      export_count: Number(r.export_print_used ?? 0),
      total_cost: Number(r.total_cost_usd ?? 0),
    })),
  });
}

