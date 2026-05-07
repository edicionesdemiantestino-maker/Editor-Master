"use client";

import { useEffect, useState } from "react";

type PlanId = "free" | "pro" | "business";

type PlanCard = {
  id: PlanId;
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
    highlights: ["Inicio sin tarjeta", "Límites del plan Free", "Ideal para probar"],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$12 / mes",
    highlights: ["Más inpaint y export", "Overage vía Stripe", "Soporte estándar"],
    accent: "blue",
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "$49 / mes",
    highlights: ["Alto volumen", "Límites ampliados", "Para equipos"],
  },
];

export function PricingTable() {
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/usage/summary", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as { plan?: string };
        if (cancelled) return;
        const p = data.plan === "business" ? "business" : data.plan === "pro" ? "pro" : "free";
        setCurrentPlan(p);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckout = async (planId: "pro" | "business") => {
    setLoading(planId);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });

    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }

    alert(data.error ?? "Error iniciando checkout");
    setLoading(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-10 text-center text-2xl font-semibold text-white">Planes y precios</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan ? currentPlan === plan.id : plan.id === "free";
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={[
                "relative rounded-xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl dark:bg-zinc-900/80",
                plan.accent === "blue" ? "border-indigo-500/50 ring-1 ring-indigo-500/40" : "",
              ].join(" ")}
            >
              {plan.accent === "blue" ? (
                <span className="absolute right-3 top-3 rounded bg-indigo-600 px-2 py-0.5 text-xs text-white">
                  Popular
                </span>
              ) : null}

              <h2 className="mb-2 text-lg font-medium">{plan.name}</h2>
              <p className="mb-4 text-3xl font-bold">{plan.priceLabel}</p>

              <ul className="mb-6 space-y-2 text-sm text-zinc-300">
                {plan.highlights.map((h) => (
                  <li key={h}>✔ {h}</li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <button
                  type="button"
                  disabled={isCurrent}
                  className="w-full rounded-lg border border-white/15 bg-white/10 py-2 text-sm font-medium text-zinc-200 disabled:cursor-default disabled:opacity-60"
                >
                  {isCurrent ? "Plan actual" : "Incluido"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (plan.id === "pro" || plan.id === "business") {
                      void handleCheckout(plan.id);
                    }
                  }}
                  disabled={isCurrent || isLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 hover:brightness-105"
                >
                  {isCurrent ? "Plan actual" : isLoading ? "Redirigiendo..." : `Elegir ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-zinc-400">
        Checkout seguro con Stripe · también podés comprar desde la página{" "}
        <a href="/pricing" className="text-indigo-300 underline decoration-indigo-300/40">
          /pricing
        </a>
        .
      </p>
    </div>
  );
}
