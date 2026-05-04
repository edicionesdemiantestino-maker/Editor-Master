"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { Canvas } from "fabric";
import { Rect } from "fabric";

import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

import { sceneRectFromTwoPoints } from "./geometry";

type DragState = {
  start: { x: number; y: number };
  preview: Rect | null;
};

type Options = {
  getCanvas: () => Canvas | null;
  /** Cuando es true, el canvas ignora objetos y captura el rectángulo en escena. */
  active: boolean;
  onRect: (rect: InpaintSceneRect) => void;
  /** Mínimo lado en unidades de escena para aceptar el trazo. */
  minDragPx?: number;
};

/**
 * Captura un rectángulo en coordenadas de escena (drag en el lienzo).
 * Dibuja un preview temporal (sin `__editorElementId`, el reconciler no lo borra).
 */
export function useMagicEraseRectCapture({
  getCanvas,
  active,
  onRect,
  minDragPx = 6,
}: Options) {
  const dragRef = useRef<DragState | null>(null);
  const prevSkipRef = useRef<boolean | null>(null);
  const prevSelectionRef = useRef<boolean | null>(null);
  const onRectRef = useRef(onRect);
  useLayoutEffect(() => {
    onRectRef.current = onRect;
  }, [onRect]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas || !active) {
      const c = getCanvas();
      if (c && prevSkipRef.current != null) {
        c.skipTargetFind = prevSkipRef.current;
        c.selection = prevSelectionRef.current ?? true;
        prevSkipRef.current = null;
        prevSelectionRef.current = null;
      }
      return;
    }

    prevSkipRef.current = canvas.skipTargetFind;
    prevSelectionRef.current = canvas.selection;
    canvas.skipTargetFind = true;
    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const ensurePreview = (): Rect => {
      let d = dragRef.current;
      if (!d) {
        d = { start: { x: 0, y: 0 }, preview: null };
        dragRef.current = d;
      }
      if (!d.preview) {
        const r = new Rect({
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          fill: "rgba(56, 189, 248, 0.22)",
          stroke: "#0ea5e9",
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        d.preview = r;
        canvas.add(r);
      }
      return d.preview;
    };

    const onDown = (opt: { e?: Event }) => {
      const e = opt.e as PointerEvent | undefined;
      if (!e) return;
      const p = canvas.getScenePoint(e);
      dragRef.current = { start: { x: p.x, y: p.y }, preview: null };
      const preview = ensurePreview();
      preview.set({ left: p.x, top: p.y, width: 0, height: 0, visible: true });
      preview.setCoords();
      canvas.requestRenderAll();
    };

    const onMove = (opt: { e?: Event }) => {
      const d = dragRef.current;
      if (!d?.start) return;
      const e = opt.e as PointerEvent | undefined;
      if (!e) return;
      const p = canvas.getScenePoint(e);
      const r = sceneRectFromTwoPoints(d.start, { x: p.x, y: p.y });
      const preview = ensurePreview();
      preview.set({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        visible: r.width > 0 && r.height > 0,
      });
      preview.setCoords();
      canvas.requestRenderAll();
    };

    const finish = (opt: { e?: Event }) => {
      const d = dragRef.current;
      if (!d?.start) return;
      const e = opt.e as PointerEvent | undefined;
      const end = e
        ? canvas.getScenePoint(e)
        : { x: d.start.x, y: d.start.y };
      const rect = sceneRectFromTwoPoints(d.start, end);
      if (d.preview) {
        canvas.remove(d.preview);
        d.preview = null;
      }
      dragRef.current = null;
      canvas.requestRenderAll();
      if (rect.width >= minDragPx && rect.height >= minDragPx) {
        onRectRef.current(rect);
      }
    };

    canvas.on("mouse:down", onDown);
    canvas.on("mouse:move", onMove);
    canvas.on("mouse:up", finish);

    return () => {
      canvas.off("mouse:down", onDown);
      canvas.off("mouse:move", onMove);
      canvas.off("mouse:up", finish);
      const d = dragRef.current;
      if (d?.preview) {
        canvas.remove(d.preview);
      }
      dragRef.current = null;
      canvas.skipTargetFind = prevSkipRef.current ?? false;
      canvas.selection = prevSelectionRef.current ?? true;
      prevSkipRef.current = null;
      prevSelectionRef.current = null;
      canvas.requestRenderAll();
    };
  }, [active, getCanvas, minDragPx]);
}
