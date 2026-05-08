"use client";

import { useState, useRef, useEffect } from "react";
import {
  CANVAS_PRESETS,
  PRESET_CATEGORIES,
  formatPresetDimensions,
  type CanvasPreset,
  type CanvasPresetCategory,
} from "@/entities/editor/canvas-presets";
import { useEditorStore } from "../store/editor-store";

const CATEGORIES: CanvasPresetCategory[] = [
  "imprenta",
  "redes-sociales",
  "presentacion",
  "web",
  "personalizado",
];

type CustomSize = { width: string; height: string };

export function CanvasSizePicker() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<CanvasPresetCategory>("imprenta");
  const [custom, setCustom] = useState<CustomSize>({
    width: "1080",
    height: "1080",
  });
  const ref = useRef<HTMLDivElement>(null);

  const present = useEditorStore((s) => s.present);
  const replacePresent = useEditorStore((s) => s.replacePresent);
  const pushHistoryAnchor = useEditorStore((s) => s.pushHistoryAnchor);

  const currentW = present.canvas.width;
  const currentH = present.canvas.height;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function applyPreset(preset: CanvasPreset) {
    pushHistoryAnchor();
    replacePresent(
      {
        ...present,
        canvas: {
          ...present.canvas,
          width: preset.width,
          height: preset.height,
        },
        meta: { ...present.meta, updatedAt: new Date().toISOString() },
      },
      "commit",
    );
    setOpen(false);
  }

  function applyCustom() {
    const w = Math.min(20000, Math.max(10, parseInt(custom.width) || 1080));
    const h = Math.min(20000, Math.max(10, parseInt(custom.height) || 1080));
    pushHistoryAnchor();
    replacePresent(
      {
        ...present,
        canvas: { ...present.canvas, width: w, height: h },
        meta: { ...present.meta, updatedAt: new Date().toISOString() },
      },
      "commit",
    );
    setOpen(false);
  }

  const presets =
    activeCategory === "personalizado"
      ? []
      : CANVAS_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
        title="Cambiar tamaño del canvas"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
          <rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 1v11M9 1v11M1 4h11M1 9h11" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.5 1"/>
        </svg>
        {currentW} × {currentH}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[340px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Categorías */}
          <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-800 px-2 pt-2 pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-t-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                  activeCategory === cat
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {PRESET_CATEGORIES[cat]}
              </button>
            ))}
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {activeCategory === "personalizado" ? (
              <div className="p-2">
                <p className="mb-3 text-xs text-zinc-500">
                  Ingresá las dimensiones en píxeles
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500">Ancho (px)</label>
                    <input
                      type="number"
                      min={10}
                      max={20000}
                      value={custom.width}
                      onChange={(e) =>
                        setCustom((v) => ({ ...v, width: e.target.value }))
                      }
                      className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="mt-4 text-zinc-500">×</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500">Alto (px)</label>
                    <input
                      type="number"
                      min={10}
                      max={20000}
                      value={custom.height}
                      onChange={(e) =>
                        setCustom((v) => ({ ...v, height: e.target.value }))
                      }
                      className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCustom}
                    className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {presets.map((preset) => {
                  const isActive =
                    preset.width === currentW && preset.height === currentH;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-medium">
                          {preset.label}
                        </div>
                        {preset.description && (
                          <div className="text-[10px] text-zinc-500">
                            {preset.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400">
                          {formatPresetDimensions(preset)}
                        </div>
                        {preset.bleedMm > 0 && (
                          <div className="text-[9px] text-emerald-500">
                            +{preset.bleedMm}mm sangrado
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}