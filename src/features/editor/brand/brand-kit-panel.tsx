"use client";

import { addBrandColor, createBrandKit } from "@/app/actions/brand-kit";
import { useBrandKit } from "./use-brand-kit";

export function BrandKitPanel() {
  const { kit, loading, setKit } = useBrandKit();

  if (loading) return <div className="p-3 text-xs text-zinc-500">Cargando marca…</div>;

  if (!kit) {
    return (
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
        <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
          Marca
        </h3>
        <p className="text-xs text-zinc-500">No tenés Brand Kit aún.</p>
        <button
          type="button"
          className="mt-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          onClick={async () => {
            const created = await createBrandKit();
            if (created) setKit(created);
          }}
        >
          Crear Brand Kit
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
      <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
        Marca
      </h3>

      {/* COLORES */}
      <div className="mb-3 flex flex-wrap gap-2">
        {kit.brand_colors?.map((c: any) => (
          <div
            key={c.id}
            className="h-8 w-8 rounded-md border border-zinc-200 dark:border-zinc-700"
            style={{ background: c.hex }}
            title={c.hex}
          />
        ))}

        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded-md border border-zinc-200 bg-transparent p-0.5 dark:border-zinc-700"
          onChange={async (e) => {
            await addBrandColor(kit.id, e.target.value);
            // optimistic UI
            setKit({
              ...kit,
              brand_colors: [
                ...(kit.brand_colors ?? []),
                { id: `tmp-${Date.now()}`, hex: e.target.value },
              ],
            });
          }}
        />
      </div>

      {/* FUENTES */}
      <div className="flex flex-col gap-1">
        {kit.brand_fonts?.map((f: any) => (
          <div key={f.id} className="text-sm" style={{ fontFamily: f.family }}>
            {f.family}
          </div>
        ))}
      </div>
    </div>
  );
}

