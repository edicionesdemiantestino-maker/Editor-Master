import { NextResponse } from "next/server";

import { requireServerUser } from "@/lib/supabase/require-server-user";

export const runtime = "nodejs";

function startOfThisMonthIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return start.toISOString();
}

function daysInThisMonth(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export async function GET() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("usage_events")
    .select("kind, cost_usd, created_at")
    .eq("user_id", auth.userId)
    .gte("created_at", startOfThisMonthIso())
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "analytics_fetch_failed" }, { status: 500 });
  }

  const daily: Record<string, number> = {};
  let total = 0;

  for (const row of data ?? []) {
    const day = String(row.created_at).slice(0, 10);
    const value = Number(row.cost_usd ?? 0);
    daily[day] = (daily[day] ?? 0) + value;
    total += value;
  }

  const today = new Date().getDate(); // 1..31
  const denom = Math.max(1, today);
  const projected = (total / denom) * daysInThisMonth();

  return NextResponse.json({
    daily: Object.entries(daily).map(([date, value]) => ({ date, value })),
    total,
    projected,
  });
}

