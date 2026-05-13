"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Canvas } from "fabric";
import { create } from "zustand";

// ── Guide store ───────────────────────────────────────────────
export type Guide = {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
  color?: string;
  locked?: boolean;
};

type GuidesStore = {
  guides: Guide[];
  visible: boolean;
  addGuide: (guide: Guide) => void;
  removeGuide: (id: string) => void;
  updateGuide: (id: string, position: number) => void;
  clearGuides: () => void;
  toggleVisible: () => void;
};

export const useGuidesStore = create<GuidesStore>((set) => ({
  guides: [],
  visible: true,
  addGuide: (guide) =>
    set((s) => ({ guides: [...s.guides, guide] })),
  removeGuide: (id) =>
    set((s) => ({ guides: s.guides.filter((g) => g.id !== id) })),
  updateGuide: (id, position) =>
    set((s) => ({
      guides: s.guides.map((g) =>
        g.id === id ? { ...g, position } : g,
      ),
    })),
  clearGuides: () => set({ guides: [] }),
  toggleVisible: () => set((s) => ({ visible: !s.visible })),
}));

// ── Tipos ─────────────────────────────────────────────────────
type RulersOverlayProps = {
  getCanvas: () => Canvas | null;
  canvasWidth: number;
  canvasHeight: number;
  size?: number;
};

const RULER_SIZE = 20;
const TICK_INTERVALS = [1, 2, 5, 10, 25, 50, 100, 200, 500];

function getTickInterval(zoom: number): number {
  const target = 60 / zoom;
  return TICK_INTERVALS.find((t) => t >= target) ?? 500;
}

// ── Ruler canvas ──────────────────────────────────────────────
function drawRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  direction: "horizontal" | "vertical",
  zoom: number,
  offset: number,
) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  if (direction === "horizontal") {
    ctx.fillRect(0, height - 0.5, width, 0.5);
  } else {
    ctx.fillRect(width - 0.5, 0, 0.5, height);
  }

  const interval = getTickInterval(zoom);
  const size = direction === "horizontal" ? width : height;
  const startUnit = Math.floor(-offset / zoom / interval) * interval;
  const endUnit = Math.ceil((size - offset) / zoom / interval) * interval;

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "9px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let u = startUnit; u <= endUnit; u += interval) {
    const screenPos = u * zoom + offset;
    const isMajor = u % (interval * 5) === 0;

    ctx.fillStyle = isMajor
      ? "rgba(255,255,255,0.4)"
      : "rgba(255,255,255,0.15)";

    if (direction === "horizontal") {
      const tickH = isMajor ? 8 : 4;
      ctx.fillRect(screenPos, height - tickH, 0.5, tickH);
      if (isMajor && zoom > 0.3) {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(String(u), screenPos, height / 2 - 2);
      }
    } else {
      const tickW = isMajor ? 8 : 4;
      ctx.fillRect(width - tickW, screenPos, tickW, 0.5);
      if (isMajor && zoom > 0.3) {
        ctx.save();
        ctx.translate(width / 2 - 2, screenPos);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(String(u), 0, 0);
        ctx.restore();
      }
    }
  }
}

// ── Componente principal ──────────────────────────────────────
export function RulersOverlay({
  getCanvas,
  canvasWidth,
  canvasHeight,
}: RulersOverlayProps) {
  const hRulerRef = useRef<HTMLCanvasElement>(null);
  const vRulerRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"h" | "v" | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const { guides, visible, addGuide, removeGuide } = useGuidesStore();
  const rafRef = useRef<number | null>(null);

  // Sync zoom/offset desde Fabric
  const syncFromCanvas = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    setZoom(canvas.getZoom());
    setOffset({ x: vpt[4] ?? 0, y: vpt[5] ?? 0 });
  }, [getCanvas]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const onRender = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(syncFromCanvas);
    };

    canvas.on("after:render", onRender);
    return () => {
      canvas.off("after:render", onRender);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getCanvas, syncFromCanvas]);

  // Dibujar rulers
  useEffect(() => {
    const hEl = hRulerRef.current;
    const vEl = vRulerRef.current;
    if (!hEl || !vEl) return;

    const hCtx = hEl.getContext("2d");
    const vCtx = vEl.getContext("2d");
    if (!hCtx || !vCtx) return;

    drawRuler(hCtx, hEl.width, hEl.height, "horizontal", zoom, offset.x + RULER_SIZE);
    drawRuler(vCtx, vEl.width, vEl.height, "vertical", zoom, offset.y + RULER_SIZE);
  }, [zoom, offset]);

  // Drag guide desde ruler
  const startDragGuide = (type: "h" | "v") => {
    setDragging(type);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const canvas = getCanvas();
    if (!canvas) return;
    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const z = canvas.getZoom();

    if (dragging === "v") {
      const screenX = e.clientX - rect.left - RULER_SIZE;
      const canvasX = (screenX - (vpt[4] ?? 0)) / z;
      if (canvasX >= 0 && canvasX <= canvasWidth) {
        // preview guía
      }
    } else {
      const screenY = e.clientY - rect.top - RULER_SIZE;
      const canvasY = (screenY - (vpt[5] ?? 0)) / z;
      if (canvasY >= 0 && canvasY <= canvasHeight) {
        // preview guía
      }
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const canvas = getCanvas();
    if (!canvas) return;
    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const z = canvas.getZoom();

    const id = `guide-${Date.now()}`;

    if (dragging === "v") {
      const screenX = e.clientX - rect.left - RULER_SIZE;
      const canvasX = (screenX - (vpt[4] ?? 0)) / z;
      if (canvasX >= 0 && canvasX <= canvasWidth) {
        addGuide({ id, type: "vertical", position: Math.round(canvasX), color: "#6366f1" });
      }
    } else {
      const screenY = e.clientY - rect.top - RULER_SIZE;
      const canvasY = (screenY - (vpt[5] ?? 0)) / z;
      if (canvasY >= 0 && canvasY <= canvasHeight) {
        addGuide({ id, type: "horizontal", position: Math.round(canvasY), color: "#6366f1" });
      }
    }

    setDragging(null);
  };

  // Calcular dimensiones del canvas en pantalla
  const screenW = canvasWidth * zoom;
  const screenH = canvasHeight * zoom;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ pointerEvents: dragging ? "all" : "none" }}
    >
      {/* Corner */}
      <div
        className="absolute left-0 top-0 z-20 flex items-center justify-center"
        style={{ width: RULER_SIZE, height: RULER_SIZE, background: "#0a0a0a", borderRight: "0.5px solid rgba(255,255,255,0.06)", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <div className="h-1 w-1 rounded-full bg-zinc-700" />
      </div>

      {/* Horizontal ruler */}
      <div
        className="absolute left-0 right-0 top-0 z-10"
        style={{ height: RULER_SIZE, marginLeft: RULER_SIZE, cursor: "s-resize", pointerEvents: "all" }}
        onMouseDown={() => startDragGuide("h")}
      >
        <canvas
          ref={hRulerRef}
          width={window?.innerWidth ?? 1200}
          height={RULER_SIZE}
          className="block"
        />
      </div>

      {/* Vertical ruler */}
      <div
        className="absolute bottom-0 left-0 top-0 z-10"
        style={{ width: RULER_SIZE, marginTop: RULER_SIZE, cursor: "e-resize", pointerEvents: "all" }}
        onMouseDown={() => startDragGuide("v")}
      >
        <canvas
          ref={vRulerRef}
          width={RULER_SIZE}
          height={window?.innerHeight ?? 900}
          className="block"
        />
      </div>

      {/* Guides overlay */}
      {visible && guides.map((guide) => {
        const color = guide.color ?? "#6366f1";
        const vpt = getCanvas()?.viewportTransform ?? [1, 0, 0, 1, 0, 0];
        const z = getCanvas()?.getZoom() ?? 1;

        if (guide.type === "vertical") {
          const screenX = guide.position * z + (vpt[4] ?? 0) + RULER_SIZE;
          return (
            <div
              key={guide.id}
              className="absolute top-0 z-30 cursor-col-resize"
              style={{
                left: screenX,
                top: RULER_SIZE,
                bottom: 0,
                width: 1,
                background: color,
                opacity: 0.6,
                pointerEvents: "all",
              }}
              onDoubleClick={() => removeGuide(guide.id)}
              title="Doble clic para eliminar"
            />
          );
        } else {
          const screenY = guide.position * z + (vpt[5] ?? 0) + RULER_SIZE;
          return (
            <div
              key={guide.id}
              className="absolute z-30 cursor-row-resize"
              style={{
                top: screenY,
                left: RULER_SIZE,
                right: 0,
                height: 1,
                background: color,
                opacity: 0.6,
                pointerEvents: "all",
              }}
              onDoubleClick={() => removeGuide(guide.id)}
              title="Doble clic para eliminar"
            />
          );
        }
      })}
    </div>
  );
}

// ── Toggle button para rulers ─────────────────────────────────
export function RulersToggleButton() {
  const { visible, toggleVisible, clearGuides, guides } = useGuidesStore();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={toggleVisible}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-medium transition ${
          visible
            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
            : "border-white/8 bg-white/5 text-zinc-500 hover:text-zinc-300"
        }`}
        title="Mostrar/ocultar reglas y guías"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="3" y1="0.5" x2="3" y2="3" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="6" y1="0.5" x2="6" y2="2" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="9" y1="0.5" x2="9" y2="3" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="0.5" y1="3" x2="3" y2="3" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="0.5" y1="6" x2="2" y2="6" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="0.5" y1="9" x2="3" y2="9" stroke="currentColor" strokeWidth="0.8"/>
        </svg>
        Reglas
      </button>
      {visible && guides.length > 0 && (
        <button
          type="button"
          onClick={clearGuides}
          className="rounded-md border border-white/8 bg-white/5 px-1.5 py-1.5 text-[9px] text-zinc-600 hover:text-zinc-300"
          title="Limpiar guías"
        >
          ✕
        </button>
      )}
    </div>
  );
}