import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => {
  return {
    createServerClient: async () => ({
      rpc: vi.fn(async () => ({ data: false, error: null })),
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
      from: vi.fn(),
    }),
  };
});

import { consumeCredits } from "@/services/billing/credits-service";

describe("credits-service", () => {
  it("throws insufficient_credits when RPC returns false", async () => {
    await expect(consumeCredits(2, "inpaint", "r1")).rejects.toThrow(
      "insufficient_credits",
    );
  });
});

