"use client";

import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";

import type { EditorDocument } from "@/entities/editor/document-schema";
import { reconcileFabricWithDocument } from "../canvas/canvas-reconciler";
import { useEditorStore } from "../store/editor-store";
import type { FabricReconcileGuardRef } from "./use-fabric-canvas-instance";

/**
 * Sincroniza Fabric con el store. Durante mutaciones transientes (drag/scale) se
 * coalesca a un único `requestAnimationFrame` para no reconciliar N veces por frame.
 * Undo/redo (`isApplyingHistory`) fuerza pasada inmediata para evitar frame “salteado”.
 */
export function useFabricDocumentReconcile(
  getCanvas: () => Canvas | null,
  reconcileGuardRef: FabricReconcileGuardRef,
) {
  const genRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingDocRef = useRef<EditorDocument | null>(null);

  useEffect(() => {
    return useEditorStore.subscribe(
      (s) => s.present,
      (doc) => {
        const canvas = getCanvas();
        if (!canvas) return;
        if (useEditorStore.getState().consumeFabricResyncSkip()) return;

        const immediate = useEditorStore.getState().isApplyingHistory;
        if (immediate) {
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          pendingDocRef.current = null;
          const my = ++genRef.current;
          reconcileGuardRef.current = true;
          void reconcileFabricWithDocument(canvas, doc, {
            isCancelled: () => my !== genRef.current,
          }).finally(() => {
            if (my === genRef.current) reconcileGuardRef.current = false;
          });
          return;
        }

        pendingDocRef.current = doc;
        if (rafRef.current != null) return;

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const latest = pendingDocRef.current;
          pendingDocRef.current = null;
          if (!latest) return;
          const c = getCanvas();
          if (!c) return;
          const my = ++genRef.current;
          reconcileGuardRef.current = true;
          void reconcileFabricWithDocument(c, latest, {
            isCancelled: () => my !== genRef.current,
          }).finally(() => {
            if (my === genRef.current) reconcileGuardRef.current = false;
          });
        });
      },
    );
  }, [getCanvas, reconcileGuardRef]);
}
