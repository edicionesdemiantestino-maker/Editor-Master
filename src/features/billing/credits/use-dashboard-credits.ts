"use client";

import { useEffect, useState } from "react";

export type DashboardCreditsPayload = {
  balance: number;
  usage: {
    usage_last_30_days: number;
    daily_usage: Array<{ day: string; total: number }>;
  };
  prediction?: {
    daysLeft: number | null;
    monthlyProjection: number;
  };
  alerts?: {
    lowBalance: boolean;
    risk: boolean;
  };
};

export function useDashboardCredits() {
  const [data, setData] = useState<DashboardCreditsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/dashboard/credits?days=30", { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as DashboardCreditsPayload & { error?: string };
        if (!res.ok) throw new Error(j.error ?? String(res.status));
        return j as DashboardCreditsPayload;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

