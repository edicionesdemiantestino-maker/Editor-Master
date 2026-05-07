import { createServerClient } from "@/lib/supabase/server";

export class InsufficientCreditsError extends Error {
  constructor(
    message = "insufficient_credits",
    public readonly amount: number,
    public readonly reason: string,
    public readonly referenceId: string,
  ) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export async function consumeCredits(args: {
  amount: number;
  reason: string;
  referenceId: string;
}): Promise<void> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("consume_credits", {
    p_amount: Math.floor(args.amount),
    p_reason: args.reason,
    p_ref: args.referenceId,
  });

  if (error) {
    // No exponer detalles de DB.
    throw new Error("credits_rpc_failed");
  }

  if (!data) {
    throw new InsufficientCreditsError(
      "insufficient_credits",
      args.amount,
      args.reason,
      args.referenceId,
    );
  }
}

