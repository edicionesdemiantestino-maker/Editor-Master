"use client";

import { useMemo } from "react";

type BleedOverlayProps = {
  canvasWidth: number;
  canvasHeight: number;
  bleedPx: number;
  marginPx: number;
  zoom?: number;
  showBleed?: boolean;
  showMargin?: boolean;
  showCropMarks?: boolean;
};

export function BleedOverlay({
  canvasWidth,
  canvasHeight,
  bleedPx,
  marginPx,
  zoom = 1,
  showBleed = true,
  showMargin = true,
  showCropMarks = false,
}: BleedOverlayProps) {
  const w = canvasWidth * zoom;
  const h = canvasHeight * zoom;
  const b = bleedPx * zoom;
  const m = marginPx * zoom;
  const cropLen = Math.min(20, b * 1.5);
  const cropGap = b * 0.4;

  const cropMarks = useMemo(() => {
    if (!showCropMarks || bleedPx <= 0) return null;
    const marks = [];
    const corners = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: 0, y: h },
      { x: w, y: h },
    ];

    for (const { x, y } of corners) {
      const isRight = x > 0;
      const isBottom = y > 0;

      // Marca horizontal
      const hx1 = isRight ? x + cropGap : x - cropGap - cropLen;
      const hx2 = isRight ? x + cropGap + cropLen : x - cropGap;
      marks.push(
        <line
          key={`h-${x}-${y}`}
          x1={hx1}
          y1={y}
          x2={hx2}
          y2={y}
          stroke="#000"
          strokeWidth={0.5}
        />,
      );

      // Marca vertical
      const vy1 = isBottom ? y + cropGap : y - cropGap - cropLen;
      const vy2 = isBottom ? y + cropGap + cropLen : y - cropGap;
      marks.push(
        <line
          key={`v-${x}-${y}`}
          x1={x}
          y1={vy1}
          x2={x}
          y2={vy2}
          stroke="#000"
          strokeWidth={0.5}
        />,
      );
    }

    return marks;
  }, [showCropMarks, bleedPx, w, h, b, cropGap, cropLen]);

  if (!showBleed && !showMargin && !showCropMarks) return null;

  const svgW = w + b * 2;
  const svgH = h + b * 2;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`${-b} ${-b} ${svgW} ${svgH}`}
      style={{
        position: "absolute",
        top: -b,
        left: -b,
        pointerEvents: "none",
        zIndex: 20,
        overflow: "visible",
      }}
      aria-hidden
    >
      {/* Área de sangrado */}
      {showBleed && bleedPx > 0 && (
        <rect
          x={-b}
          y={-b}
          width={w + b * 2}
          height={h + b * 2}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}

      {/* Área de margen (zona segura) */}
      {showMargin && marginPx > 0 && (
        <rect
          x={m}
          y={m}
          width={w - m * 2}
          height={h - m * 2}
          fill="none"
          stroke="#6366f1"
          strokeWidth={0.8}
          strokeDasharray="3 3"
          opacity={0.5}
        />
      )}

      {/* Marcas de corte */}
      {cropMarks}

      {/* Labels */}
      {showBleed && bleedPx > 0 && (
        <text
          x={-b + 3}
          y={-b + 9}
          fontSize={8}
          fill="#f59e0b"
          opacity={0.7}
          fontFamily="ui-monospace, monospace"
        >
          sangrado
        </text>
      )}
      {showMargin && marginPx > 0 && (
        <text
          x={m + 3}
          y={m + 9}
          fontSize={8}
          fill="#6366f1"
          opacity={0.7}
          fontFamily="ui-monospace, monospace"
        >
          margen
        </text>
      )}
    </svg>
  );
}

// ── Hook para controlar el overlay ────────────────────────────
import { create } from "zustand";

type BleedOverlayStore = {
  showBleed: boolean;
  showMargin: boolean;
  showCropMarks: boolean;
  bleedMm: number;
  marginMm: number;
  setShowBleed: (v: boolean) => void;
  setShowMargin: (v: boolean) => void;
  setShowCropMarks: (v: boolean) => void;
  setBleedMm: (v: number) => void;
  setMarginMm: (v: number) => void;
};

export const useBleedOverlayStore = create<BleedOverlayStore>((set) => ({
  showBleed: false,
  showMargin: false,
  showCropMarks: false,
  bleedMm: 3,
  marginMm: 10,
  setShowBleed: (v) => set({ showBleed: v }),
  setShowMargin: (v) => set({ showMargin: v }),
  setShowCropMarks: (v) => set({ showCropMarks: v }),
  setBleedMm: (v) => set({ bleedMm: v }),
  setMarginMm: (v) => set({ marginMm: v }),
}));