import { createServerClient } from "@/lib/supabase/server";
import { logStructuredLine } from "@/lib/observability/structured-log";

import type { UsagePrediction } from "./usage-prediction";

export type UsageAlerts = {
  lowBalance: boolean;
  risk: boolean;
};

export async function checkUsageAlerts(args: {
  userId: string;
  prediction: UsagePrediction;
}): Promise<UsageAlerts> {
  const supabase = await createServerClient();

  const { data: settings } = await supabase
    .from("billing_settings")
    .select("alert_threshold, email_alerts")
    .eq("user_id", args.userId)
    .maybeSingle();

  const alertThreshold = Number((settings as any)?.alert_threshold ?? 20);
  const emailAlerts = Boolean((settings as any)?.email_alerts ?? true);

  const { data: balRow } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", args.userId)
    .maybeSingle();

  const balance = Number((balRow as any)?.balance ?? 0);

  const lowBalance = balance < alertThreshold;
  const risk = args.prediction.daysLeft != null && args.prediction.daysLeft < 3;

  if (lowBalance || risk) {
    logStructuredLine(
      {
        service: "actions/project-persistence",
        userId: args.userId,
        event: "billing_alert",
        code: `${lowBalance ? "low_balance" : ""}${risk ? ";risk" : ""}`.slice(
          0,
          80,
        ),
      },
      "warn",
    );
    // Email stub: keep non-blocking and server-only.
    if (emailAlerts) {
      // TODO: integrate provider (Resend/Sendgrid). Stub only.
      void 0;
    }
  }

  return { lowBalance, risk };
}

