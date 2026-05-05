"use client";

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
    <button
      type="button"
      onClick={() => void openPortal()}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
    >
      Gestionar suscripción
    </button>
  );
}

