import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabase/server";

import { trackUsageEvent } from "./usage-service";

export type TrackableUsageKind = "inpaint" | "export-print" | "ai-text";

/**
 * Registro central de uso (server / RLS). Preferir `trackUsageEvent` en APIs con `userId` ya resuelto.
 */
export async function trackUsage(kind: TrackableUsageKind, amount = 1) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await trackUsageEvent(supabase, user.id, kind, null, amount, 0);
}

export async function trackUsageForUser(
  supabase: SupabaseClient,
  userId: string,
  kind: TrackableUsageKind,
  amount = 1,
  costUsd?: number,
  jobId?: string | null,
) {
  await trackUsageEvent(supabase, userId, kind, jobId ?? null, amount, costUsd ?? 0);
}
