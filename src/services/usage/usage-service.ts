import type { SupabaseClient } from "@supabase/supabase-js";

export async function trackUsageEvent(
  supabase: SupabaseClient,
  userId: string,
  kind: "inpaint" | "export-print",
  jobId: string | null,
  costUnits = 1,
  costUsd = 0,
) {
  const row = {
    user_id: userId,
    kind,
    job_id: jobId,
    cost_units: costUnits,
    cost_usd: costUsd,
  };

  const q = supabase.from("usage_events");
  const { error } = jobId
    ? await q.upsert(row, { onConflict: "job_id,kind" })
    : await q.insert(row);

  if (error) {
    console.error("trackUsageEvent failed", error);
  }
}

