"use client";

import { useEffect, useState } from "react";

type Settings = {
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
};

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition ${
        checked
          ? "border-violet-400/40 bg-violet-500/25"
          : "border-white/10 bg-white/5"
      } disabled:opacity-50`}
      aria-pressed={checked}
      aria-label="Enable auto top-up"
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export function AutoTopupCard() {
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

  const save = async (next: Settings) => {
    setBusy(true);
    try {
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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-200 hover:scale-[1.01]">
      <div className="pointer-events-none absolute -bottom-24 right-0 h-52 w-64 bg-gradient-to-tr from-violet-500/12 to-transparent blur-2xl" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Auto top-up
          </div>
          <div className="mt-1 text-sm text-white/80">
            Auto recharge when your balance is low
          </div>
          <div className="mt-2 text-xs text-white/50">
            Requires a saved payment method on your Stripe customer.
          </div>
        </div>

        <Switch
          checked={Boolean(s?.auto_topup_enabled)}
          disabled={busy || !s}
          onChange={(v) => {
            if (!s) return;
            void save({ ...s, auto_topup_enabled: v });
          }}
        />
      </div>

      {!s ? (
        <div className="mt-4 text-xs text-white/50">Couldn’t load settings.</div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
              Threshold
            </span>
            <input
              type="number"
              disabled={busy}
              value={s.auto_topup_threshold}
              onChange={(e) =>
                setS({
                  ...s,
                  auto_topup_threshold: Math.max(0, Math.floor(Number(e.target.value))),
                })
              }
              onBlur={() => void save(s)}
              className="h-10 rounded-xl border border-white/10 bg-[#0b0f1a] px-3 text-sm text-white outline-none transition focus:border-white/20"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
              Recharge amount
            </span>
            <input
              type="number"
              disabled={busy}
              value={s.auto_topup_amount}
              onChange={(e) =>
                setS({
                  ...s,
                  auto_topup_amount: Math.max(0, Math.floor(Number(e.target.value))),
                })
              }
              onBlur={() => void save(s)}
              className="h-10 rounded-xl border border-white/10 bg-[#0b0f1a] px-3 text-sm text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
      )}
    </div>
  );
}

