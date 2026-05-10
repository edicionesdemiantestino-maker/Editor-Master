"use client";

import { useState } from "react";
import type { Canvas } from "fabric";
import {
  SHAPE_CATALOG,
  insertShape,
  DEFAULT_SHAPE_STYLE,
  type ShapeStyle,
} from "../engines/shape-engine";

type ShapePickerProps = {
  getCanvas: () => Canvas | null;
};

export function ShapePicker({ getCanvas }: ShapePickerProps) {
  const [open, setOpen] = useState(false);
  const [fill, setFill] = useState(DEFAULT_SHAPE_STYLE.fill);
  const [stroke, setStroke] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(0);

  const handleInsert = (type: (typeof SHAPE_CATALOG)[number]["type"]) => {
    const canvas = getCanvas();
    if (!canvas) return;

    const style: ShapeStyle = {
      fill,
      stroke: strokeWidth > 0 ? stroke : "transparent",
      strokeWidth,
      opacity: 1,
    };

    insertShape(canvas, type, style);
    setOpen(false);
  };

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
        title="Insertar forma"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.7"/>
          <circle cx="9" cy="9" r="2.5" fill="currentColor"/>
          <path d="M 1 10 L 5 6 L 8 9" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
        </svg>
        + Forma
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">

          {/* Style controls */}
          <div className="mb-3 flex flex-col gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
              Estilo
            </p>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-10">Relleno</span>
              <input
                type="color"
                value={fill}
                onChange={(e) => setFill(e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5"
              />
              <span className="font-mono text-[9px] text-zinc-600">
                {fill.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-10">Borde</span>
              <input
                type="color"
                value={stroke}
                onChange={(e) => setStroke(e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5"
              />
              <input
                type="number"
                min={0}
                max={20}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-200 focus:outline-none"
                placeholder="px"
              />
            </div>
          </div>

          {/* Shapes grid */}
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
            Formas
          </p>
          <div className="grid grid-cols-3 gap-1">
            {SHAPE_CATALOG.map((shape) => (
              <button
                key={shape.type}
                type="button"
                onClick={() => handleInsert(shape.type)}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-800/40 px-2 py-2.5 text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                title={
                  shape.shortcut
                    ? `${shape.label} (${shape.shortcut})`
                    : shape.label
                }
              >
                <span className="text-lg leading-none">{shape.icon}</span>
                <span className="text-[9px] leading-none">{shape.label.split(" ")[0]}</span>
                {shape.shortcut && (
                  <span className="text-[8px] text-zinc-700">{shape.shortcut}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}