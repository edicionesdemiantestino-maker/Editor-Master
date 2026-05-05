"use client";

import { useEffect, useState } from "react";

type SubscriptionInfo =
  | {
      subscription: {
        status: string;
        currentPeriodEnd: number;
      };
    }
  | { subscription: null }
  | { error: string };

export function useSubscription() {
  const [data, setData] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    fetch("/api/stripe/subscription")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: "subscription_fetch_failed" }));
  }, []);

  return data;
}

