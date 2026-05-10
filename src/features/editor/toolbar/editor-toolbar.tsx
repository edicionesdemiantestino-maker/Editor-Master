"use client";

import Link from "next/link";
import { useState } from "react";

import { ExportModal } from "@/features/editor/export/ui";
import { duplicateActiveObject } from "../canvas/fabric-toolbar-actions";
import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";
import { AddImageControl } from "./add-image-control";
import { EditorToolbarCloudSave } from "./editor-toolbar-cloud-save";
import { CreditsBadge } from "@/features/billing/credits/credits-badge";
import { CanvasSizePicker } from "./canvas-size-picker";
import { useBleedOverlayStore } from "../canvas/bleed-overlay";
import { AlignmentToolbar } from "./alignment-toolbar";
import { ShapePicker } from "./shape-picker";

type EditorToolbarProps = {
  fabricCanvasGetter: () => import("fabric").Canvas | null;
  projectId: string;
  onOpenCommandMenu?: () => void;
};

export function EditorToolbar({
  fabricCanvasGetter,
  projectId,
  onOpenCommandMenu,
}: EditorToolbarProps) {
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const [exportOpen, setExportOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(false);

  const {
    showBleed,
    showMargin,
    showCropMarks,
    setShowBleed,
    setShowMargin,
    setShowCropMarks,
    bleedMm,
    marginMm,
    setBleedMm,
    setMarginMm,
  } = useBleedOverlayStore();

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 bg-zinc-950/95 px-3 py-2 backdrop-blur">
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        getCanvas={fabricCanvasGetter}
      />

      {/* Nav */}
      <Link
        href="/dashboard/projects"
        className="mr-1 text-xs text-zinc-600 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        ← Proyectos
      </Link>

      <button
        type="button"
        onClick={onOpenCommandMenu}
        className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/5 px-2 py-1.5 text-[10px] text-zinc-500 transition hover:bg-white/8 hover:text-zinc-300"
        title="Command menu (⌘K)"
      >
        ⌘K
      </button>

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Canvas size */}
      <CanvasSizePicker />

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Insert */}
      <button
        type="button"
        className="rounded-md border border-white/10 bg-white/8 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/12 hover:text-white"
        onClick={() => {
          const s = useEditorStore.getState();
          s.addElement(createDefaultTextElement(s.present));
        }}
      >
        + Texto
      </button>

      <AddImageControl />
      <ShapePicker getCanvas={fabricCanvasGetter} />

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Alignment */}
      <AlignmentToolbar getCanvas={fabricCanvasGetter} />

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Guías de impresión */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowGuides((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition ${
            showBleed || showMargin
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-white/8 bg-white/5 text-zinc-500 hover:text-zinc-300"
          }`}
          title="Guías de impresión"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="2.5" y="2.5" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.5 1"/>
          </svg>
          Guías
        </button>

        {showGuides && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Guías de impresión
            </p>
            <label className="flex cursor-pointer items-center justify-between py-1">
              <span className="text-xs text-zinc-300">Sangrado</span>
              <input
                type="checkbox"
                checked={showBleed}
                onChange={(e) => setShowBleed(e.target.checked)}
                className="accent-amber-500"
              />
            </label>
            {showBleed && (
              <div className="mb-1 flex items-center gap-2 pl-2">
                <span className="text-[10px] text-zinc-500">mm</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={bleedMm}
                  onChange={(e) => setBleedMm(Number(e.target.value))}
                  className="w-14 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            )}
            <label className="flex cursor-pointer items-center justify-between py-1">
              <span className="text-xs text-zinc-300">Margen</span>
              <input
                type="checkbox"
                checked={showMargin}
                onChange={(e) => setShowMargin(e.target.checked)}
                className="accent-indigo-500"
              />
            </label>
            {showMargin && (
              <div className="mb-1 flex items-center gap-2 pl-2">
                <span className="text-[10px] text-zinc-500">mm</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={marginMm}
                  onChange={(e) => setMarginMm(Number(e.target.value))}
                  className="w-14 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            )}
            <label className="flex cursor-pointer items-center justify-between py-1">
              <span className="text-xs text-zinc-300">Marcas de corte</span>
              <input
                type="checkbox"
                checked={showCropMarks}
                onChange={(e) => setShowCropMarks(e.target.checked)}
                className="accent-zinc-400"
              />
            </label>
          </div>
        )}
      </div>

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Cloud save */}
      <EditorToolbarCloudSave projectId={projectId} />
      <CreditsBadge />

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* History */}
      <button
        type="button"
        className="rounded-md border border-white/8 px-2.5 py-1.5 text-xs text-zinc-400 disabled:opacity-30 hover:border-white/15 hover:text-zinc-200"
        disabled={!canUndo}
        onClick={() => useEditorStore.getState().undo()}
      >
        ↩ Deshacer
      </button>
      <button
        type="button"
        className="rounded-md border border-white/8 px-2.5 py-1.5 text-xs text-zinc-400 disabled:opacity-30 hover:border-white/15 hover:text-zinc-200"
        disabled={!canRedo}
        onClick={() => useEditorStore.getState().redo()}
      >
        ↪ Rehacer
      </button>

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Duplicate */}
      <button
        type="button"
        className="rounded-md border border-white/8 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-white/15 hover:text-zinc-200"
        onClick={() =>
          void duplicateActiveObject(fabricCanvasGetter()).catch(() => {
            window.alert("No se pudo duplicar la selección.");
          })
        }
      >
        ⧉ Duplicar
      </button>

      <div className="mx-1 h-5 w-px bg-white/8" aria-hidden />

      {/* Export */}
      <button
        type="button"
        className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20 hover:text-indigo-200"
        onClick={() => setExportOpen(true)}
      >
        ↗ Exportar
      </button>
    </div>
  );
}