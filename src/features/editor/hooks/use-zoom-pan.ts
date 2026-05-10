"use client";

import { useEffect, useRef, useState } from "react";
import type { Canvas } from "fabric";
import {
  zoomToPoint,
  panCanvas,
  fitToScreen,
  getZoomPercent,
} from "../engines/zoom-pan-engine";

type UseZoomPanOptions = {
  getCanvas: () => Canvas | null;
  enabled?: boolean;
};

export function useZoomPan({ getCanvas, enabled = true }: UseZoomPanOptions) {
  const isPanningRef = useRef(false);
  const isSpaceDownRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!enabled) return;

    // ── Wheel zoom ────────────────────────────────────────────
    const handleWheel = (e: WheelEvent) => {
      const canvas = getCanvas();
      if (!canvas) return;

      // Solo zoom si Ctrl/Cmd presionado o es trackpad pinch
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const canvasEl = canvas.getElement();
        const rect = canvasEl.getBoundingClientRect();
        zoomToPoint(
          canvas,
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          e.deltaY,
        );
        setZoom(getZoomPercent(canvas));
        return;
      }

      // Pan con scroll normal
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        panCanvas(canvas, -e.deltaX, -e.deltaY);
      }
    };

    // ── Spacebar pan ──────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpaceDownRef.current) {
        const active = document.activeElement;
        const tag = active?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;

        e.preventDefault();
        isSpaceDownRef.current = true;

        const canvas = getCanvas();
        if (canvas) {
          canvas.defaultCursor = "grab";
          canvas.setCursor("grab");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDownRef.current = false;
        isPanningRef.current = false;
        lastPanPointRef.current = null;

        const canvas = getCanvas();
        if (canvas) {
          canvas.defaultCursor = "default";
          canvas.setCursor("default");
        }
      }
    };

    // ── Mouse pan con spacebar ────────────────────────────────
    const handleMouseDown = (e: MouseEvent) => {
      if (!isSpaceDownRef.current) return;
      e.preventDefault();
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };

      const canvas = getCanvas();
      if (canvas) {
        canvas.setCursor("grabbing");
        canvas.selection = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !lastPanPointRef.current) return;
      e.preventDefault();

      const canvas = getCanvas();
      if (!canvas) return;

      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };

      panCanvas(canvas, dx, dy);
    };

    const handleMouseUp = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      lastPanPointRef.current = null;

      const canvas = getCanvas();
      if (canvas) {
        canvas.setCursor(isSpaceDownRef.current ? "grab" : "default");
        canvas.selection = true;
      }
    };

    // ── Fit on double-click workspace ─────────────────────────
    const handleDblClick = (e: MouseEvent) => {
      const canvas = getCanvas();
      if (!canvas) return;
      const el = canvas.getElement();
      if (e.target === el.parentElement || e.target === el.parentElement?.parentElement) {
        fitToScreen(canvas);
        setZoom(getZoomPercent(canvas));
      }
    };

    // ── Attach events ─────────────────────────────────────────
    const canvasContainer = getCanvas()?.getElement().parentElement;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("dblclick", handleDblClick);

    if (canvasContainer) {
      canvasContainer.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("dblclick", handleDblClick);

      if (canvasContainer) {
        canvasContainer.removeEventListener("wheel", handleWheel);
      }
    };
  }, [getCanvas, enabled]);

  return { zoom, setZoom };
}