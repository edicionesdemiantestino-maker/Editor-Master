"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Canvas } from "fabric";

import { useEditorStore } from "../../store/editor-store";
import {
  DEFAULT_EXPORT_FORM,
  type ExportFormState,
  type ExportFormatKind,
} from "../export-types";
import { executeExportDownload } from "../services/export-service";

import { ExportSettings } from "./ExportSettings";
import { FormatSelector } from "./FormatSelector";

export type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  getCanvas: () => Canvas | null;
};

export function ExportModal({ open, onClose, getCanvas }: ExportModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const docTitle = useEditorStore((s) => s.present.meta.title);
  const canvasW = useEditorStore((s) => s.present.canvas.width);
  const canvasH = useEditorStore((s) => s.present.canvas.height);

  const [form, setForm] = useState<ExportFormState>(DEFAULT_EXPORT_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchForm = useCallback((partial: Partial<ExportFormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const setFormat = useCallback((next: ExportFormatKind) => {
    setForm((prev) => {
      const base = { ...prev, format: next };
      if (next === "pdf-print" && prev.bleedMm <= 0) {
        return { ...base, bleedMm: 3 };
      }
      if (next !== "pdf-print") {
        return {
          ...base,
          requestServerCmykPdf: false,
          drawPrintCropMarks: false,
        };
      }
      return base;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>('button[role="radio"]')
        ?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const onDownload = async () => {
    const canvas = getCanvas();
    if (!canvas) {
      setError("El canvas no está listo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const document = useEditorStore.getState().present;
      await executeExportDownload({ canvas, document, form });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Exportar diseño
            </h2>
            <p
              id={descId}
              className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
            >
              {docTitle || "Sin título"} · {canvasW}×{canvasH}px
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Formato
            </h3>
            <div className="mt-2">
              <FormatSelector
                value={form.format}
                disabled={busy}
                onChange={setFormat}
              />
            </div>
          </section>

          <div className="mt-6">
            <ExportSettings form={form} disabled={busy} onChange={patchForm} />
          </div>

          {error ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 bg-zinc-50/90 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/80">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-white disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
            onClick={() => void onDownload()}
          >
            {busy ? "Generando…" : "Descargar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
