"use client";

import { useState, useEffect } from "react";
import type { Canvas } from "fabric";
import { useEditorStore } from "../store/editor-store";
import { useViewportStore } from "../hooks/use-responsive-preview";

type BottomBarProps = {
  getCanvas: () => Canvas | null;
};

export function BottomBar({ getCanvas }: BottomBarProps) {
  const [zoom, setZoom] = useState(100);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const canvasWidth = useEditorStore((s) => s.present.canvas.width);
  const canvasHeight = useEditorStore((s) => s.present.canvas.height);
  const elementCount = useEditorStore((s) => s.present.canvas.elements.length);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);
  const { viewport, setViewport } = useViewportStore();

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const updateZoom = () => {
      setZoom(Math.round(canvas.getZoom() * 100));
    };

    const updateCoords = (opt: any) => {
      const pointer = opt?.pointer ?? opt?.scenePoint;
      if (pointer) {
        setCoords({
          x: Math.round(pointer.x),
          y: Math.round(pointer.y),
        });
      }
    };

    canvas.on("after:render", updateZoom);
    canvas.on("mouse:move", updateCoords);

    return () => {
      canvas.off("after:render", updateZoom);
      canvas.off("mouse:move", updateCoords);
    };
  }, [getCanvas]);

  const setZoomLevel = (level: number) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const clamped = Math.min(500, Math.max(10, level));
    canvas.setZoom(clamped / 100);
    canvas.requestRenderAll();
    setZoom(clamped);
  };

  const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200] as const;

  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-t border-white/5 bg-zinc-950/90 px-3 text-[10px] text-zinc-500 backdrop-blur">
      {/* Izquierda */}
      <div className="flex items-center gap-3">
        <span className="font-mono">
          {canvasWidth} × {canvasHeight}px
        </span>
        <span className="text-white/10">|</span>
        <span>
          {elementCount} {elementCount === 1 ? "elemento" : "elementos"}
          {selectedCount > 0 && (
            <span className="ml-1 text-indigo-400">
              · {selectedCount} seleccionado{selectedCount > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </div>

      {/* Centro — viewport */}
      <div className="flex items-center gap-1">
        {(["desktop", "tablet", "mobile"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setViewport(v)}
            className={`rounded px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide transition ${
              viewport === v
                ? "bg-indigo-600/30 text-indigo-300"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {v === "desktop" ? "🖥" : v === "tablet" ? "📱" : "📲"}
          </button>
        ))}
      </div>

      {/* Derecha — zoom + coords */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-zinc-700">
          {coords.x}, {coords.y}
        </span>
        <span className="text-white/10">|</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel(zoom - 10)}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          >
            −
          </button>
          <div className="group relative">
            <button
              type="button"
              className="min-w-[44px] rounded px-1.5 py-0.5 text-center font-mono text-[10px] text-zinc-400 hover:bg-white/5"
            >
              {zoom}%
            </button>
            <div className="absolute bottom-full right-0 mb-1 hidden flex-col overflow-hidden rounded-lg border border-white/8 bg-zinc-900 shadow-xl group-hover:flex">
              {ZOOM_PRESETS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoomLevel(z)}
                  className={`px-4 py-1.5 text-left text-[11px] transition hover:bg-white/5 ${
                    zoom === z ? "text-indigo-400" : "text-zinc-400"
                  }`}
                >
                  {z}%
                </button>
              ))}
              <div className="border-t border-white/8" />
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="px-4 py-1.5 text-left text-[11px] text-zinc-400 hover:bg-white/5"
              >
                Restablecer
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setZoomLevel(zoom + 10)}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}