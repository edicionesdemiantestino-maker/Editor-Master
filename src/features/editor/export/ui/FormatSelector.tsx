"use client";

import type { ExportFormatKind } from "../export-types";

const FORMATS: ReadonlyArray<{
  id: ExportFormatKind;
  label: string;
  description: string;
}> = [
  {
    id: "png",
    label: "PNG",
    description: "Ideal para web y capas. Transparencia opcional.",
  },
  {
    id: "jpeg",
    label: "JPG",
    description: "Archivo más liviano, sin canal alpha.",
  },
  {
    id: "pdf-rgb",
    label: "PDF estándar",
    description: "RGB para pantalla y compartir.",
  },
  {
    id: "pdf-print",
    label: "PDF impresión",
    description: "Sangrado + manifiesto JSON para CMYK en backend.",
  },
];

type FormatSelectorProps = {
  value: ExportFormatKind;
  onChange: (next: ExportFormatKind) => void;
  disabled?: boolean;
};

export function FormatSelector({
  value,
  onChange,
  disabled,
}: FormatSelectorProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="radiogroup"
      aria-label="Formato de exportación"
    >
      {FORMATS.map((f) => {
        const selected = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={[
              "flex flex-col rounded-xl border px-3 py-3 text-left text-sm transition",
              selected
                ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/40"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
            onClick={() => onChange(f.id)}
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {f.label}
            </span>
            <span className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {f.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
