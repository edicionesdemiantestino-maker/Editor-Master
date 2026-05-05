import type { SupabaseClient } from "@supabase/supabase-js";

export async function consumeDailyQuota(
  supabase: SupabaseClient,
  kind: "inpaint" | "export-print",
  limit: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    "consume_user_quota_daily",
    {
      p_kind: kind,
      p_limit: limit,
    },
  );

  if (error) {
    console.error("quota_rpc_error", error);
    throw new Error("quota_check_failed");
  }

  return data === true;
}

