"use client";

import { useEffect, useRef } from "react";
import type { SnapGuide } from "./snap-engine";

type SnapOverlayProps = {
  guides: SnapGuide[];
  canvasWidth: number;
  canvasHeight: number;
  zoom?: number;
};

const GUIDE_COLOR = "#6366f1";
const GUIDE_WIDTH = 1;

export function SnapOverlay({
  guides,
  canvasWidth,
  canvasHeight,
  zoom = 1,
}: SnapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const w = canvasWidth * zoom;
    const h = canvasHeight * zoom;

    ctx.clearRect(0, 0, w, h);

    if (guides.length === 0) return;

    ctx.save();
    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth = GUIDE_WIDTH;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.85;

    for (const guide of guides) {
      ctx.beginPath();

      if (guide.type === "vertical") {
        const x = Math.round(guide.position * zoom) + 0.5;
        const y1 = Math.round(guide.start * zoom);
        const y2 = Math.round(guide.end * zoom);
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
      } else {
        const y = Math.round(guide.position * zoom) + 0.5;
        const x1 = Math.round(guide.start * zoom);
        const x2 = Math.round(guide.end * zoom);
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
      }

      ctx.stroke();
    }

    ctx.restore();
  }, [guides, canvasWidth, canvasHeight, zoom]);

  const w = canvasWidth * zoom;
  const h = canvasHeight * zoom;

  if (guides.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: w,
        height: h,
        pointerEvents: "none",
        zIndex: 10,
      }}
      aria-hidden
    />
  );
}