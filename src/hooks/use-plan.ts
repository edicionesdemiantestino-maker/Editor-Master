"use client";

import { useEffect, useState } from "react";

import { getUserPlanAction } from "@/app/actions/plan";
import type { UserPlan } from "@/services/plans/plan-service";

export function usePlan() {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserPlanAction()
      .then((p) => {
        if (!cancelled) setPlan(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, loading };
}
