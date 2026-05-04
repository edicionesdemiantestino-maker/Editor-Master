"use client";

import {
  EXPORT_SCALE_PRESETS,
  type ExportFormState,
  type ExportFormatKind,
} from "../export-types";

type ExportSettingsProps = {
  form: ExportFormState;
  onChange: (patch: Partial<ExportFormState>) => void;
  disabled?: boolean;
};

export function ExportSettings({ form, onChange, disabled }: ExportSettingsProps) {
  return (
    <div className="space-y-5 border-t border-zinc-200 pt-5 dark:border-zinc-700">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Calidad / tamaño
        </legend>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Escala respecto al lienzo lógico (1× = tamaño del documento, 4× = cuatro
          veces más píxeles por lado).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPORT_SCALE_PRESETS.map((n) => {
            const active = form.scale === n;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                className={[
                  "min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-medium transition",
                  active
                    ? "border-sky-500 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500",
                  disabled ? "opacity-50" : "",
                ].join(" ")}
                onClick={() => onChange({ scale: n })}
              >
                {n}×
              </button>
            );
          })}
        </div>
      </fieldset>

      <FormatSpecificBlock format={form.format} form={form} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function FormatSpecificBlock(props: {
  format: ExportFormatKind;
  form: ExportFormState;
  onChange: (patch: Partial<ExportFormState>) => void;
  disabled?: boolean;
}) {
  const { format, form, onChange, disabled } = props;

  if (format === "png") {
    return (
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          PNG
        </legend>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600"
            checked={form.pngPreserveTransparency}
            disabled={disabled}
            onChange={(e) =>
              onChange({ pngPreserveTransparency: e.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Conservar transparencia
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              Si está desactivado, el canal alpha se rellena con el color de fondo
              del documento.
            </span>
          </span>
        </label>
      </fieldset>
    );
  }

  if (format === "jpeg") {
    return (
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          JPEG
        </legend>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
            <span>Calidad</span>
            <span className="font-mono tabular-nums">
              {Math.round(form.jpegQuality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.85}
            max={1}
            step={0.01}
            disabled={disabled}
            value={form.jpegQuality}
            className="h-2 w-full cursor-pointer accent-sky-600 disabled:opacity-50"
            onChange={(e) =>
              onChange({ jpegQuality: Number.parseFloat(e.target.value) })
            }
          />
        </div>
      </fieldset>
    );
  }

  if (format === "pdf-rgb" || format === "pdf-print") {
    return (
      <>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            PDF — raster embebido
          </legend>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            PNG sin pérdida dentro del PDF (más peso) o JPEG de alta calidad.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="radio"
                name="pdf-raster"
                className="h-4 w-4 border-zinc-300 text-sky-600"
                checked={form.pdfRasterEncoding === "png-lossless"}
                disabled={disabled}
                onChange={() => onChange({ pdfRasterEncoding: "png-lossless" })}
              />
              PNG (sin pérdida)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="radio"
                name="pdf-raster"
                className="h-4 w-4 border-zinc-300 text-sky-600"
                checked={form.pdfRasterEncoding === "jpeg-high"}
                disabled={disabled}
                onChange={() => onChange({ pdfRasterEncoding: "jpeg-high" })}
              />
              JPEG (alta calidad)
            </label>
          </div>
        </fieldset>

        {(format === "pdf-rgb" && form.pdfRasterEncoding === "jpeg-high") ||
        (format === "pdf-print" && form.pdfRasterEncoding === "jpeg-high") ? (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Calidad JPEG en PDF
            </legend>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                <span>Calidad</span>
                <span className="font-mono tabular-nums">
                  {Math.round(form.jpegQuality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.88}
                max={1}
                step={0.01}
                disabled={disabled}
                value={form.jpegQuality}
                className="h-2 w-full cursor-pointer accent-sky-600 disabled:opacity-50"
                onChange={(e) =>
                  onChange({ jpegQuality: Number.parseFloat(e.target.value) })
                }
              />
            </div>
          </fieldset>
        ) : null}

        {format === "pdf-print" ? (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Prensa
            </legend>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Sangrado alrededor del cajón lógico. Se descarga un PDF RGB de
              referencia + JSON de medidas; opcionalmente un PDF CMYK generado
              en servidor (sharp + pdfkit, 300 dpi).
            </p>
            <div className="mt-2 flex items-center gap-3">
              <label className="text-sm text-zinc-700 dark:text-zinc-300">
                Sangrado (mm)
              </label>
              <input
                type="number"
                min={0}
                max={12}
                step={0.5}
                disabled={disabled}
                value={form.bleedMm}
                className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value);
                  if (Number.isFinite(v)) {
                    onChange({ bleedMm: Math.min(12, Math.max(0, v)) });
                  }
                }}
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600"
                checked={form.requestServerCmykPdf}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ requestServerCmykPdf: e.target.checked })
                }
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  PDF CMYK en servidor
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Requiere sesión. Convierte el mismo raster a CMYK (JPEG) y
                  compone PDF con sangrado. Perfiles ICC: preparar variables de
                  entorno en el host (ver comentarios en la ruta API).
                </span>
              </span>
            </label>
            <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600"
                checked={form.drawPrintCropMarks}
                disabled={disabled || !form.requestServerCmykPdf}
                onChange={(e) =>
                  onChange({ drawPrintCropMarks: e.target.checked })
                }
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Marcas de corte (PDF CMYK)
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Trazos finos en la zona de sangrado alrededor del cajón.
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}
      </>
    );
  }

  return null;
}
