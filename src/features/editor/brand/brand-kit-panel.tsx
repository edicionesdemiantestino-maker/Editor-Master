"use client";

import { useRouter } from "next/navigation";

import { addBrandColor, createBrandKit } from "@/app/actions/brand-kit";
import { GradientButton } from "@/components/ui/gradient-button";
import { useBillingPlanGate } from "@/hooks/use-billing-plan-gate";

import { useBrandKit } from "./use-brand-kit";

export function BrandKitPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { kit, loading, setKit } = useBrandKit();
  const { plan, limits, loading: gateLoading } = useBillingPlanGate();

  const borderClass = embedded ? "" : "border-t border-zinc-800 dark:border-zinc-700";

  if (loading || gateLoading) {
    return <div className="p-3 text-xs text-zinc-500">Cargando marca…</div>;
  }

  const allowBrand = limits?.brandKit === true;

  if (!allowBrand) {
    return (
      <div className={`p-3 ${borderClass}`}>
        <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">Marca</h3>
        <p className="text-xs text-zinc-400">
          Brand Kit disponible en <span className="text-zinc-200">Pro</span> o superior.
        </p>
        <GradientButton
          type="button"
          className="mt-3 w-full text-xs"
          onClick={() => router.push("/pricing")}
        >
          Upgrade
        </GradientButton>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className={`p-3 ${borderClass}`}>
        <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
          Marca
        </h3>
        <p className="text-xs text-zinc-500">No tenés Brand Kit aún.</p>
        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-white"
          onClick={async () => {
            try {
              const created = await createBrandKit();
              if (created) setKit(created);
            } catch {
              window.alert("No se pudo crear el kit. Verificá límites del plan.");
            }
          }}
        >
          Crear Brand Kit
        </button>
      </div>
    );
  }

  return (
    <div className={`p-3 ${borderClass}`}>
      <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
        Marca
      </h3>
      {plan ? (
        <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-600">Plan {plan}</p>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {kit.brand_colors?.map((c: { id: string; hex: string }) => (
          <div
            key={c.id}
            className="h-8 w-8 rounded-md border border-zinc-700"
            style={{ background: c.hex }}
            title={c.hex}
          />
        ))}

        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded-md border border-zinc-700 bg-transparent p-0.5"
          onChange={async (e) => {
            try {
              await addBrandColor(kit.id, e.target.value);
              setKit({
                ...kit,
                brand_colors: [
                  ...(kit.brand_colors ?? []),
                  { id: `tmp-${Date.now()}`, hex: e.target.value },
                ],
              });
            } catch {
              window.alert("Tu plan no permite agregar colores o hubo un error.");
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        {kit.brand_fonts?.map((f: { id: string; family: string }) => (
          <div key={f.id} className="text-sm" style={{ fontFamily: f.family }}>
            {f.family}
          </div>
        ))}
      </div>
    </div>
  );
}
