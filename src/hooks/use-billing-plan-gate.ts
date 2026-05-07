"use client";

import { useEffect, useState } from "react";

import { getBillingPlanGate } from "@/app/actions/plan-gate";
import type { BillingPlanSlug, PlanProductLimits } from "@/lib/billing/plans";

export function useBillingPlanGate() {
  const [plan, setPlan] = useState<BillingPlanSlug | null>(null);
  const [limits, setLimits] = useState<PlanProductLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBillingPlanGate()
      .then((r) => {
        if (cancelled) return;
        setPlan(r.plan);
        setLimits(r.limits);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, limits, loading };
}
