import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => {
  return {
    createServerClient: async () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { balance: 30 }, error: null }),
          }),
        }),
      }),
      rpc: async () => ({
        data: [
          { day: "2026-05-01", total_credits: 10 },
          { day: "2026-05-02", total_credits: 10 },
          { day: "2026-05-03", total_credits: 10 },
        ],
        error: null,
      }),
    }),
  };
});

import { predictUsage } from "@/services/billing/usage-prediction";

describe("predictUsage", () => {
  it("computes avgDaily and daysLeft", async () => {
    const p = await predictUsage("u1");
    expect(p.avgDaily).toBeGreaterThan(0);
    expect(p.daysLeft).toBe(3);
    expect(p.monthlyProjection).toBeGreaterThan(0);
  });
});

