"use client";

import { useState } from "react";

type Pack = "small" | "medium" | "large";

export function BuyCreditsButton({ pack }: { pack: Pack }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
      onClick={() => {
        setBusy(true);
        fetch("/api/stripe/buy-credits", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pack }),
        })
          .then(async (res) => {
            const j = (await res.json()) as { url?: string; error?: string };
            if (!res.ok || !j.url) throw new Error(j.error ?? "buy_credits_failed");
            window.location.href = j.url;
          })
          .catch(() => {
            window.alert("No se pudo iniciar la compra de créditos.");
            setBusy(false);
          });
      }}
    >
      {busy ? "Redirigiendo…" : "Comprar créditos"}
    </button>
  );
}

