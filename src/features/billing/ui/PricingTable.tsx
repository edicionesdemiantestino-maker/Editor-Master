"use client";

import { useEffect, useState } from "react";

type PlanCard = {
  id: "free" | "pro";
  name: string;
  priceLabel: string;
  highlights: string[];
  accent?: "blue";
};

const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    highlights: ["5 inpaint / mes", "2 export print / mes", "Límite duro"],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$10 / mes",
    highlights: [
      "100 inpaint incluidos",
      "50 export print incluidos",
      "Overage permitido",
    ],
    accent: "blue",
  },
];

export function PricingTable() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/usage/summary", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as { plan?: string };
        if (cancelled) return;
        if (data.plan === "free" || data.plan === "pro") setCurrentPlan(data.plan);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckout = async (planId: "pro") => {
    setLoading(planId);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId }),
    });

    const data = (await res.json().catch(() => ({}))) as { url?: string };

    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }

    alert("Error iniciando checkout");
    setLoading(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-10 text-center text-2xl font-semibold">Planes y precios</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan ? currentPlan === plan.id : plan.id === "free";
          const isPro = plan.id === "pro";
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={[
                "relative rounded-xl border bg-white p-6 dark:bg-zinc-900",
                plan.accent === "blue" ? "border-2 border-blue-600" : "",
              ].join(" ")}
            >
              {isPro ? (
                <span className="absolute right-3 top-3 rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
                  Popular
                </span>
              ) : null}

              <h2 className="mb-2 text-lg font-medium">{plan.name}</h2>
              <p className="mb-4 text-3xl font-bold">{plan.priceLabel}</p>

              <ul className="mb-6 space-y-2 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h}>✔ {h}</li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-md bg-zinc-200 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {isCurrent ? "Plan actual" : "Incluido"}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout("pro")}
                  disabled={isCurrent || isLoading}
                  className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCurrent ? "Plan actual" : isLoading ? "Redirigiendo..." : "Actualizar a Pro"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

