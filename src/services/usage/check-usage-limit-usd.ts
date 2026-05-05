import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hard cap by monthly USD cost (best-effort).
 * Uses `get_monthly_usage` (auth.uid() enforced) and compares vs a provided limit.
 */
export async function checkMonthlyUsdLimit(args: {
  supabase: SupabaseClient;
  userId: string;
  limitUsd: number;
}): Promise<{ allowed: boolean; totalUsd: number; limitUsd: number }> {
  const { data, error } = await args.supabase.rpc("get_monthly_usage", {
    uid: args.userId,
  });
  if (error) {
    throw new Error("monthly_usage_fetch_failed");
  }

  const totalUsd = (data ?? []).reduce(
    (acc: number, r: any) => acc + Number(r.total_cost ?? 0),
    0,
  );

  return { allowed: totalUsd < args.limitUsd, totalUsd, limitUsd: args.limitUsd };
}

