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

  const [{ data: balRow, error: balErr }, { data: ledgerRows, error: ledErr }] =
    await Promise.all([
      supabase
        .from("user_credit_balances")
        .select("balance, updated_at")
        .eq("user_id", auth.userId)
        .maybeSingle(),
      supabase
        .from("credit_ledger")
        .select("delta, reason, reference_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (balErr || ledErr) {
    console.error("credits_summary_failed", balErr ?? ledErr);
    return NextResponse.json({ error: "credits_failed" }, { status: 500 });
  }

  return NextResponse.json({
    balance: Number(balRow?.balance ?? 0),
    updated_at: balRow?.updated_at ?? null,
    ledger: (ledgerRows ?? []).map((r: any) => ({
      delta: Number(r.delta ?? 0),
      reason: String(r.reason ?? "").slice(0, 40),
      reference_id: r.reference_id ? String(r.reference_id).slice(0, 200) : null,
      created_at: String(r.created_at ?? ""),
    })),
  });
}

