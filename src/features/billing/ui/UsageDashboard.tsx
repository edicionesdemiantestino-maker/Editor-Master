"use client";

import { useUsageSummary } from "../use-usage-summary";
import { useSubscription } from "../use-subscription";

export function UsageDashboard() {
  const { data, loading } = useUsageSummary();
  const sub = useSubscription();

  const openPortal = async () => {
    const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      window.alert(body.error ?? "No se pudo abrir el portal de Stripe.");
      return;
    }
    window.location.href = body.url;
  };

  if (loading) return <div className="p-6">Cargando uso...</div>;
  if (!data || data.error) return <div className="p-6">Error cargando datos</div>;

  const { usage, plan } = data as any;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Uso y facturación</h1>
        <button
          type="button"
          onClick={() => void openPortal()}
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Administrar suscripción
        </button>
      </div>

      <UsageCard title="Inpaint" {...usage.inpaint} />
      <UsageCard title="Export Print" {...usage["export-print"]} />

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-medium">Resumen</h2>
        <p className="text-sm">
          Plan: <strong>{plan}</strong>
        </p>
        {sub && "subscription" in sub && sub.subscription ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Estado: {sub.subscription.status}
            <br />
            Próxima renovación:{" "}
            {new Date(sub.subscription.currentPeriodEnd * 1000).toLocaleDateString()}
          </p>
        ) : null}
        <p className="text-sm">
          Costo total: $
          {(Number(usage.inpaint.cost) + Number(usage["export-print"].cost)).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function UsageCard({
  title,
  used,
  limit,
  cost,
}: {
  title: string;
  used: number;
  limit: number;
  cost: number;
}) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex justify-between gap-2">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-zinc-500">
          {used} / {limit}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full transition-all ${
            percent > 90 ? "bg-red-500" : percent > 70 ? "bg-yellow-500" : "bg-blue-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-zinc-500">
        <span>{percent.toFixed(0)}% usado</span>
        <span>${Number(cost).toFixed(2)}</span>
      </div>
    </div>
  );
}

