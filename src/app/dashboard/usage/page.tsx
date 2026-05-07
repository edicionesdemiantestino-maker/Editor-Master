"use client";

import { motion } from "framer-motion";

import { DashboardUsage } from "@/features/billing/usage/dashboard-usage";

import { ManageBillingButton } from "./ManageBillingButton";

export default function UsagePage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-6xl space-y-8 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Uso y costos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Datos en vivo desde Supabase. Gestioná facturación y método de pago con Stripe.
          </p>
        </div>
        <ManageBillingButton />
      </div>

      <DashboardUsage />
    </motion.div>
  );
}
