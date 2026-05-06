"use client";

import { useEffect, useState } from "react";

import { getUserPlanAction } from "@/app/actions/plan";

export function usePlan() {
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    getUserPlanAction().then(setPlan);
  }, []);

  return plan;
}

