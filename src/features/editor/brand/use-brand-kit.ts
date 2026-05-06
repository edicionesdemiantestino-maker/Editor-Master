"use client";

import { useEffect, useState } from "react";

import { getBrandKit } from "@/app/actions/brand-kit";

export function useBrandKit() {
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBrandKit()
      .then((data) => {
        if (!cancelled) setKit(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { kit, loading, setKit };
}

