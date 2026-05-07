"use server";

import { logError } from "@/lib/logger";
import { createServerClient } from "@/lib/supabase/server";

export type UsageDashboardTotals = {
  exports: number;
  inpaints: number;
};

export type UsageDashboardDailyPoint = {
  date: string;
  exports: number;
  inpaints: number;
};

export type UsageDashboardPayload = {
  daily: UsageDashboardDailyPoint[];
  totals: UsageDashboardTotals;
  month_to_date: UsageDashboardTotals;
  quota_today: UsageDashboardTotals;
};

export async function getUsageDashboard(): Promise<UsageDashboardPayload | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("get_usage_dashboard");

  if (error) {
    logError("usage_dashboard_rpc", error);
    return null;
  }

  if (data == null || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const totals = raw.totals as UsageDashboardTotals | undefined;
  const monthToDate = raw.month_to_date as UsageDashboardTotals | undefined;
  const quotaToday = raw.quota_today as UsageDashboardTotals | undefined;

  if (!totals || !monthToDate || !quotaToday) {
    return null;
  }

  const dailyRaw = raw.daily;
  const daily = Array.isArray(dailyRaw)
    ? (dailyRaw as UsageDashboardDailyPoint[])
    : [];

  return {
    daily,
    totals,
    month_to_date: monthToDate,
    quota_today: quotaToday,
  };
}
