"use client";

import type { Canvas } from "fabric";
import {
  alignObjects,
  distributeObjects,
  type AlignTarget,
} from "../engines/alignment-engine";
import {
  flipHorizontal,
  flipVertical,
  centerOnCanvas,
  rotateBy,
} from "../engines/transform-engine";
import { useEditorStore } from "../store/editor-store";
import { useState } from "react";

type AlignmentToolbarProps = {
  getCanvas: () => Canvas | null;
};

type ActionButton = {
  icon: string;
  label: string;
  action: () => void;
  disabled?: boolean;
};

export function AlignmentToolbar({ getCanvas }: AlignmentToolbarProps) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const [target, setTarget] = useState<AlignTarget>("selection");
  const [open, setOpen] = useState(false);

  const hasSelection = selectedIds.length > 0;
  const hasMulti = selectedIds.length > 1;

  const canvas = () => getCanvas();

  const alignActions: ActionButton[] = [
    {
      icon: "⬤",
      label: "Alinear izquierda",
      action: () => { const c = canvas(); if (c) alignObjects(c, "left", target); },
      disabled: !hasSelection,
    },
    {
      icon: "◉",
      label: "Centrar horizontal",
      action: () => { const c = canvas(); if (c) alignObjects(c, "center-h", target); },
      disabled: !hasSelection,
    },
    {
      icon: "⬤",
      label: "Alinear derecha",
      action: () => { const c = canvas(); if (c) alignObjects(c, "right", target); },
      disabled: !hasSelection,
    },
    {
      icon: "⬤",
      label: "Alinear arriba",
      action: () => { const c = canvas(); if (c) alignObjects(c, "top", target); },
      disabled: !hasSelection,
    },
    {
      icon: "◉",
      label: "Centrar vertical",
      action: () => { const c = canvas(); if (c) alignObjects(c, "center-v", target); },
      disabled: !hasSelection,
    },
    {
      icon: "⬤",
      label: "Alinear abajo",
      action: () => { const c = canvas(); if (c) alignObjects(c, "bottom", target); },
      disabled: !hasSelection,
    },
  ];

  const distributeActions: ActionButton[] = [
    {
      icon: "⇔",
      label: "Distribuir horizontal",
      action: () => { const c = canvas(); if (c) distributeObjects(c, "horizontal"); },
      disabled: !hasMulti,
    },
    {
      icon: "⇕",
      label: "Distribuir vertical",
      action: () => { const c = canvas(); if (c) distributeObjects(c, "vertical"); },
      disabled: !hasMulti,
    },
  ];

  const transformActions: ActionButton[] = [
    {
      icon: "↔",
      label: "Flip horizontal",
      action: () => { const c = canvas(); if (c) flipHorizontal(c); },
      disabled: !hasSelection,
    },
    {
      icon: "↕",
      label: "Flip vertical",
      action: () => { const c = canvas(); if (c) flipVertical(c); },
      disabled: !hasSelection,
    },
    {
      icon: "⊙",
      label: "Centrar en canvas",
      action: () => { const c = canvas(); if (c) centerOnCanvas(c); },
      disabled: !hasSelection,
    },
    {
      icon: "↺",
      label: "Rotar -45°",
      action: () => { const c = canvas(); if (c) rotateBy(c, -45); },
      disabled: !hasSelection,
    },
    {
      icon: "↻",
      label: "Rotar +45°",
      action: () => { const c = canvas(); if (c) rotateBy(c, 45); },
      disabled: !hasSelection,
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
          open
            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
            : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        }`}
        title="Alineación y transformación"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="2" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.6"/>
          <rect x="7" y="4" width="4" height="6" rx="0.5" fill="currentColor"/>
          <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1"/>
        </svg>
        Alinear
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">

          {/* Target */}
          <div className="mb-3 flex items-center gap-1 rounded-lg bg-zinc-800 p-0.5">
            {(["selection", "canvas"] as AlignTarget[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={`flex-1 rounded-md py-1 text-[10px] font-medium transition ${
                  target === t
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "selection" ? "Selección" : "Canvas"}
              </button>
            ))}
          </div>

          {/* Alineación */}
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
            Alineación
          </p>
          <div className="mb-3 grid grid-cols-6 gap-1">
            {[
              { dir: "left" as const, svg: <AlignLeftIcon /> },
              { dir: "center-h" as const, svg: <AlignCenterHIcon /> },
              { dir: "right" as const, svg: <AlignRightIcon /> },
              { dir: "top" as const, svg: <AlignTopIcon /> },
              { dir: "center-v" as const, svg: <AlignCenterVIcon /> },
              { dir: "bottom" as const, svg: <AlignBottomIcon /> },
            ].map(({ dir, svg }) => (
              <button
                key={dir}
                type="button"
                disabled={!hasSelection}
                onClick={() => {
                  const c = canvas();
                  if (c) alignObjects(c, dir, target);
                }}
                title={alignActions.find((_, i) => ["left","center-h","right","top","center-v","bottom"][i] === dir)?.label}
                className="flex h-8 w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/40 text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
              >
                {svg}
              </button>
            ))}
          </div>

          {/* Distribuir */}
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
            Distribuir
          </p>
          <div className="mb-3 grid grid-cols-2 gap-1">
            {distributeActions.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onClick={a.action}
                title={a.label}
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-800/40 text-xs text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
              >
                <span>{a.icon}</span>
                <span className="text-[10px]">
                  {a.label.replace("Distribuir ", "")}
                </span>
              </button>
            ))}
          </div>

          {/* Transformar */}
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
            Transformar
          </p>
          <div className="grid grid-cols-5 gap-1">
            {transformActions.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onClick={a.action}
                title={a.label}
                className="flex h-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/40 text-sm text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
              >
                {a.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────
function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="2" y1="1" x2="2" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3.5" y="3" width="7" height="3" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="3.5" y="8" width="5" height="3" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function AlignCenterHIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="2" y="3" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="3.5" y="8" width="7" height="3" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="12" y1="1" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3.5" y="3" width="7" height="3" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="5.5" y="8" width="5" height="3" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function AlignTopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3" y="3.5" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="3.5" width="3" height="5" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function AlignCenterVIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3" y="2" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="3.5" width="3" height="7" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function AlignBottomIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="1" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3" y="3.5" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="5.5" width="3" height="5" rx="0.5" fill="currentColor"/>
    </svg>
  );
}