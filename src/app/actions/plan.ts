"use server";

import { getUserPlan } from "@/services/plans/plan-service";

export async function getUserPlanAction() {
  return await getUserPlan();
}

