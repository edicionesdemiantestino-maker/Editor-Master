"use client";

import { useEffect, useRef } from "react";

type WorkspaceBackgroundProps = {
  showGrid?: boolean;
};

export function WorkspaceBackground({ showGrid = true }: WorkspaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const w = el.offsetWidth || window.innerWidth;
    const h = el.offsetHeight || window.innerHeight;
    el.width = w;
    el.height = h;

    ctx.clearRect(0, 0, w, h);

    if (!showGrid) return;

    // Grid ultra sutil
    const gridSize = 24;
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;

    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Dots en intersecciones
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let x = 0; x < w; x += gridSize) {
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [showGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}