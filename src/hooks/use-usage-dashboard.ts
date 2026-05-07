"use client";

import { useEffect, useState } from "react";

import {
  type UsageDashboardPayload,
  getUsageDashboard,
} from "@/app/actions/usage-dashboard";

export function useUsageDashboard() {
  const [data, setData] = useState<UsageDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUsageDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
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
