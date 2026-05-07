import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("billing_settings")
    .select(
      "auto_topup_enabled, auto_topup_threshold, auto_topup_amount, alert_threshold, email_alerts",
    )
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    console.error("billing_settings_get_failed", error);
    return NextResponse.json({ error: "settings_failed" }, { status: 500 });
  }

  return NextResponse.json({
    auto_topup_enabled: Boolean((data as any)?.auto_topup_enabled ?? false),
    auto_topup_threshold: Number((data as any)?.auto_topup_threshold ?? 10),
    auto_topup_amount: Number((data as any)?.auto_topup_amount ?? 100),
    alert_threshold: Number((data as any)?.alert_threshold ?? 20),
    email_alerts: Boolean((data as any)?.email_alerts ?? true),
  });
}

export async function PUT(req: Request) {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    auto_topup_enabled: boolean;
    auto_topup_threshold: number;
    auto_topup_amount: number;
    alert_threshold: number;
    email_alerts: boolean;
  }>;

  const patch = {
    user_id: auth.userId,
    auto_topup_enabled:
      typeof body.auto_topup_enabled === "boolean" ? body.auto_topup_enabled : undefined,
    auto_topup_threshold:
      typeof body.auto_topup_threshold === "number"
        ? Math.max(0, Math.floor(body.auto_topup_threshold))
        : undefined,
    auto_topup_amount:
      typeof body.auto_topup_amount === "number"
        ? Math.max(0, Math.floor(body.auto_topup_amount))
        : undefined,
    alert_threshold:
      typeof body.alert_threshold === "number"
        ? Math.max(0, Math.floor(body.alert_threshold))
        : undefined,
    email_alerts: typeof body.email_alerts === "boolean" ? body.email_alerts : undefined,
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>;

  // Remove undefined keys so we don't overwrite values unexpectedly.
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) delete patch[k];
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("billing_settings")
    .upsert(patch, { onConflict: "user_id" });

  if (error) {
    console.error("billing_settings_put_failed", error);
    return NextResponse.json({ error: "settings_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

