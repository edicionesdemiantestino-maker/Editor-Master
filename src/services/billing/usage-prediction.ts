import { createServerClient } from "@/lib/supabase/server";

export type UsagePrediction = {
  avgDaily: number;
  daysLeft: number | null;
  monthlyProjection: number;
};

export async function predictUsage(userId: string): Promise<UsagePrediction> {
  const supabase = await createServerClient();

  const [{ data: balRow }, { data: dailyAgg }] = await Promise.all([
    supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle(),
    // Prefer matview-backed RPC (fast). Falls back gracefully if empty.
    supabase.rpc("get_usage_daily_agg", { p_days: 7 }),
  ]);

  const balance = Number((balRow as any)?.balance ?? 0);
  const rows = (dailyAgg ?? []) as Array<{ day: string; total_credits: number }>;
  const last7 = rows.slice(-7);
  const sum = last7.reduce((acc, r) => acc + Number(r.total_credits ?? 0), 0);
  const avgDaily = last7.length ? sum / last7.length : 0;

  const daysLeft =
    avgDaily > 0 ? Math.max(0, Math.floor(balance / avgDaily)) : null;
  const monthlyProjection = Math.round(avgDaily * 30);

  return {
    avgDaily,
    daysLeft,
    monthlyProjection,
  };
}

