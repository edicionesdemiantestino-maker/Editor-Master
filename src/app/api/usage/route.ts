import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysRaw = url.searchParams.get("days");
  const days = Math.min(90, Math.max(7, Math.floor(Number(daysRaw ?? 30))));

  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("get_usage_timeseries", { days });

  if (error) {
    console.error("usage_api_error", error);
    return NextResponse.json({ error: "usage_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    day: string;
    inpaint_used: number;
    export_print_used: number;
    inpaint_limit: number;
    export_print_limit: number;
    total_cost_usd: number;
  }>;

  return NextResponse.json({
    days,
    series: {
      inpaint: rows.map((r) => ({
        date: r.day,
        used: Number(r.inpaint_used ?? 0),
        limit: Number(r.inpaint_limit ?? 0),
      })),
      exportPrint: rows.map((r) => ({
        date: r.day,
        used: Number(r.export_print_used ?? 0),
        limit: Number(r.export_print_limit ?? 0),
      })),
    },
    data: rows.map((r) => ({
      day: r.day,
      inpaint_count: Number(r.inpaint_used ?? 0),
      export_print_count: Number(r.export_print_used ?? 0),
      total_cost_usd: Number(r.total_cost_usd ?? 0),
    })),
  });
}

