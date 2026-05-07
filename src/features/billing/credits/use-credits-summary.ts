"use client";

import { useEffect, useState } from "react";

export type CreditsSummary = {
  balance: number;
  ledger: Array<{
    delta: number;
    reason: string;
    created_at: string;
  }>;
};

export function useCreditsSummary() {
  const [data, setData] = useState<CreditsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/credits/summary", { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as CreditsSummary & { error?: string };
        if (!res.ok) throw new Error(j.error ?? String(res.status));
        return j as CreditsSummary;
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

