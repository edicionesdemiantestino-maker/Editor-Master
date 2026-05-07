import { createServerClient } from "@/lib/supabase/server";
import { maybeTriggerAutoTopUp } from "@/services/billing/auto-topup-service";

// Nota: `usage_events.kind` tiene CHECK; usamos el valor real que permite el DB.
export type CreditKind = "inpaint" | "export-print" | "ai-text";

export async function consumeCredits(
  amount: number,
  kind: CreditKind,
  ref: string,
): Promise<void> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("consume_credits", {
    p_amount: Math.floor(amount),
    p_kind: kind,
    p_ref: ref,
  });

  if (error) {
    throw new Error("credits_rpc_failed");
  }

  if (!data) {
    throw new Error("insufficient_credits");
  }

  // Fire-and-forget auto top-up (never block primary flow).
  if (user?.id) {
    void maybeTriggerAutoTopUp(user.id);
  }
}

export async function getUserCredits(): Promise<number> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.balance ?? 0);
}

export async function assertCreditsOrThrow(args: {
  amount: number;
  kind: CreditKind;
  ref: string;
}): Promise<void> {
  await consumeCredits(args.amount, args.kind, args.ref);
}

