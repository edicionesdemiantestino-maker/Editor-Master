"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";

import { startSubscriptionCheckout } from "@/features/billing/start-subscription-checkout";

function PricingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "1";

  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient().auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setLoggedIn(Boolean(data.user));
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onPaidPlan(planId: "pro" | "business") {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}&message=required`);
      return;
    }
    setBusyPlan(planId);
    const ok = await startSubscriptionCheckout(planId);
    if (!ok) {
      alert("No se pudo iniciar el checkout. Revisá que Stripe esté configurado e intentá de nuevo.");
    }
    setBusyPlan(null);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.2),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planes</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Checkout con Stripe. Los límites se aplican al completar la suscripción.
            </p>
          </div>
          <Button variant="outline" href="/">
            Volver al inicio
          </Button>
        </div>

        {canceled ? (
          <GlassCard animated={false} className="mb-8 border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Pago cancelado. Podés elegir un plan cuando quieras.
          </GlassCard>
        ) : null}

        {!sessionReady ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <GlassCard animated={false} className="p-6">
              <h2 className="text-lg font-semibold">Free</h2>
              <p className="mt-2 text-3xl font-bold">$0</p>
              <p className="mt-4 text-sm text-zinc-400">Empezá sin tarjeta y probá el editor.</p>
              <Button className="mt-6 w-full" href="/register">
                Crear cuenta
              </Button>
            </GlassCard>

            <GlassCard animated={false} className="border-indigo-500/40 bg-indigo-500/10 p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                Popular
              </span>
              <h2 className="mt-1 text-lg font-semibold">Pro</h2>
              <p className="mt-2 text-3xl font-bold">$12</p>
              <p className="mt-4 text-sm text-zinc-400">Más exportaciones e inpaint para equipos pequeños.</p>
              <GradientButton
                type="button"
                disabled={busyPlan === "pro"}
                className="mt-6 w-full"
                onClick={() => void onPaidPlan("pro")}
              >
                {busyPlan === "pro" ? "Redirigiendo…" : loggedIn ? "Suscribirme" : "Ingresar y suscribirme"}
              </GradientButton>
            </GlassCard>

            <GlassCard animated={false} className="p-6">
              <h2 className="text-lg font-semibold">Business</h2>
              <p className="mt-2 text-3xl font-bold">$49</p>
              <p className="mt-4 text-sm text-zinc-400">
                Alto volumen · alineado a <Link href="/dashboard/upgrade" className="underline decoration-white/30">upgrade</Link>
              </p>
              <GradientButton
                type="button"
                disabled={busyPlan === "business"}
                className="mt-6 w-full"
                onClick={() => void onPaidPlan("business")}
              >
                {busyPlan === "business" ? "Redirigiendo…" : loggedIn ? "Suscribirme" : "Ingresar y suscribirme"}
              </GradientButton>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black p-8 text-zinc-400">Cargando…</div>}>
      <PricingInner />
    </Suspense>
  );
}
