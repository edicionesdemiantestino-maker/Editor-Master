"use client";

type Props = {
  status: "ok" | "low" | "critical";
  label?: string;
};

export function AlertBadge({ status, label }: Props) {
  const text =
    label ??
    (status === "ok" ? "OK" : status === "low" ? "Riesgo bajo" : "Crítico");

  const cls =
    status === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
      : status === "low"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
        : "border-red-500/25 bg-red-500/10 text-red-100";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${cls}`}
    >
      {text}
    </span>
  );
}

