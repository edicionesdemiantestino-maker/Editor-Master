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
  const days = Math.min(365, Math.max(1, Math.floor(Number(daysRaw ?? 30))));

  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("usage_by_day", { p_days: days });
  if (error) {
    console.error("usage_by_day_rpc_error", error);
    return NextResponse.json({ error: "usage_by_day_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ day: string; count: number | string }>;
  const series = rows.map((r) => ({
    day: String(r.day).slice(0, 10),
    count: Number(r.count ?? 0),
  }));

  const last7 = series.slice(-7);
  const sumLast7 = last7.reduce((acc, r) => acc + r.count, 0);
  const avgLast7 = last7.length ? sumLast7 / last7.length : 0;
  const monthlyPrediction = Math.round(avgLast7 * 30);

  return NextResponse.json({
    days,
    series,
    monthlyPrediction,
  });
}
