"use client";

import { useEffect, useState } from "react";

import { GlassCard } from "@/components/ui/glass-card";

type Settings = {
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
  alert_threshold: number;
  email_alerts: boolean;
};

export function BillingSettingsCard() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setS(j as Settings);
      })
      .catch(() => {
        if (!cancelled) setS(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!s) return;
    setBusy(true);
    try {
      const next = { ...s, ...patch };
      setS(next);
      await fetch("/api/billing/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white">Auto top-up</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Recarga automática cuando el saldo baja del umbral (si hay método de pago guardado).
      </p>

      {!s ? (
        <p className="mt-3 text-xs text-zinc-500">No se pudo cargar la configuración.</p>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-300">Habilitar</span>
            <input
              type="checkbox"
              checked={s.auto_topup_enabled}
              disabled={busy}
              onChange={(e) => void save({ auto_topup_enabled: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-300">Umbral (créditos)</span>
            <input
              type="number"
              className="w-24 rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-white"
              value={s.auto_topup_threshold}
              disabled={busy}
              onChange={(e) => void save({ auto_topup_threshold: Number(e.target.value) })}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-300">Recarga (créditos)</span>
            <input
              type="number"
              className="w-24 rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-white"
              value={s.auto_topup_amount}
              disabled={busy}
              onChange={(e) => void save({ auto_topup_amount: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
    </GlassCard>
  );
}

