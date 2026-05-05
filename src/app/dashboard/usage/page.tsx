"use client";

import { useEffect, useMemo, useState } from "react";

import { UsageChart, type UsagePoint } from "./UsageChart";
import { ManageBillingButton } from "./ManageBillingButton";

type Row = {
  day: string;
  inpaint_count: number;
  export_print_count: number;
  total_cost_usd: number;
};

type ApiResponse = {
  data: Row[];
  series: {
    inpaint: UsagePoint[];
    exportPrint: UsagePoint[];
  };
};

export default function UsagePage() {
  const [data, setData] = useState<Row[]>([]);
  const [inpaintSeries, setInpaintSeries] = useState<UsagePoint[]>([]);
  const [exportSeries, setExportSeries] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/usage?days=30`)
      .then((r) => r.json())
      .then((res: ApiResponse) => {
        setData((res?.data ?? []) as Row[]);
        setInpaintSeries((res?.series?.inpaint ?? []) as UsagePoint[]);
        setExportSeries((res?.series?.exportPrint ?? []) as UsagePoint[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalCost = useMemo(
    () => data.reduce((acc, d) => acc + Number(d.total_cost_usd), 0),
    [data],
  );
  const totalInpaint = useMemo(
    () => data.reduce((acc, d) => acc + Number(d.inpaint_count), 0),
    [data],
  );
  const totalExport = useMemo(
    () => data.reduce((acc, d) => acc + Number(d.export_print_count), 0),
    [data],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Uso y costos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gestioná plan, facturas y método de pago desde Stripe.
          </p>
        </div>
        <ManageBillingButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Costo total" value={`$${totalCost.toFixed(2)}`} />
        <Card title="Inpaints" value={totalInpaint} />
        <Card title="Exports" value={totalExport} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UsageChart title="Inpaint diario" data={inpaintSeries} />
        <UsageChart title="Export Print diario" data={exportSeries} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-center">Inpaint</th>
              <th className="p-2 text-center">Export</th>
              <th className="p-2 text-center">Costo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                  Cargando…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                  Sin uso en el rango.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.day} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-2">{row.day}</td>
                  <td className="p-2 text-center">{row.inpaint_count}</td>
                  <td className="p-2 text-center">{row.export_print_count}</td>
                  <td className="p-2 text-center">
                    ${Number(row.total_cost_usd).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

