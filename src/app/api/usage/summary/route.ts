import { NextResponse } from "next/server";

import { requireServerUser } from "@/lib/supabase/require-server-user";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/pricing";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_monthly_usage", {
    uid: auth.userId,
  });

  if (error) {
    return NextResponse.json({ error: "usage_fetch_failed" }, { status: 500 });
  }

  const { data: limits, error: limitsErr } = await supabase.rpc("get_user_limits");
  if (limitsErr || !limits?.[0]) {
    return NextResponse.json({ error: "limits_fetch_failed" }, { status: 500 });
  }

  const plan = String(limits[0].plan_id ?? "free") as keyof typeof PLANS;
  const planKey: keyof typeof PLANS = plan in PLANS ? plan : "free";

  const usageMap = Object.fromEntries((data ?? []).map((u: any) => [u.kind, u]));

  const result = {
    plan: planKey,
    usage: {
      inpaint: {
        used: usageMap.inpaint?.total_quantity ?? 0,
        limit: PLANS[planKey].monthlyIncluded.inpaint,
        cost: Number(usageMap.inpaint?.total_cost ?? 0),
      },
      "export-print": {
        used: usageMap["export-print"]?.total_quantity ?? 0,
        limit: PLANS[planKey].monthlyIncluded["export-print"],
        cost: Number(usageMap["export-print"]?.total_cost ?? 0),
      },
    },
  };

  return NextResponse.json(result);
}

