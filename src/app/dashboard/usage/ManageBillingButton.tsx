"use client";

import { motion } from "framer-motion";

export function ManageBillingButton() {
  const openPortal = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      window.alert(body.error ?? "No se pudo abrir el portal de Stripe.");
      return;
    }
    window.location.href = body.url;
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      onClick={() => void openPortal()}
      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl hover:border-white/25 hover:bg-white/10"
    >
      Gestionar suscripción
    </motion.button>
  );
}
