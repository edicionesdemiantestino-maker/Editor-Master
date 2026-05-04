"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { Canvas } from "fabric";

import { reconcileFabricWithDocument } from "../canvas/canvas-reconciler";
import { applyFabricPerformanceDefaults } from "../canvas/fabric-defaults";
import { disposeCanvas } from "../canvas/object-factory";
import { useEditorStore } from "../store/editor-store";

export type FabricReconcileGuardRef = MutableRefObject<boolean>;

export function useFabricCanvasInstance(
  reconcileGuardRef: FabricReconcileGuardRef,
  onReady?: (canvas: Canvas) => void,
) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const reconcileGenRef = useRef(0);

  const getCanvas = useCallback(() => fabricRef.current, []);

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    applyFabricPerformanceDefaults();

    const initial = useEditorStore.getState().present;
    const canvas = new Canvas(el, {
      width: initial.canvas.width,
      height: initial.canvas.height,
      backgroundColor: initial.canvas.backgroundColor,
      preserveObjectStacking: true,
      uniformScaling: true,
    });
    const ctx2d = canvas.lowerCanvasEl?.getContext("2d");
    if (ctx2d) {
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = "high";
    }
    fabricRef.current = canvas;
    onReady?.(canvas);

    const myGen = ++reconcileGenRef.current;
    reconcileGuardRef.current = true;
    void reconcileFabricWithDocument(canvas, initial, {
      isCancelled: () => myGen !== reconcileGenRef.current,
    }).finally(() => {
      if (myGen === reconcileGenRef.current) {
        reconcileGuardRef.current = false;
      }
    });

    return () => {
      reconcileGenRef.current += 1;
      disposeCanvas(canvas);
      fabricRef.current = null;
    };
  }, [onReady, reconcileGuardRef]);

  return { canvasElRef, fabricRef, getCanvas };
}
