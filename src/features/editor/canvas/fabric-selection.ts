"use client";

import type { MutableRefObject } from "react";

import type { ElementId } from "@/entities/editor/document-schema";
import type { Canvas, FabricObject } from "fabric";
import { ActiveSelection } from "fabric";

import { findFabricObjectByElementId } from "./fabric-element-id";

/**
 * Aplica la selección del store al canvas Fabric (panel de capas → canvas).
 * Pone `suppressSelectionEventsRef` en true mientras muta la selección para evitar bucles con listeners de Fabric.
 */
export function applyStoreSelectionToFabricCanvas(
  canvas: Canvas | null,
  selectedIds: ElementId[],
  suppressSelectionEventsRef: MutableRefObject<boolean>,
): void {
  if (!canvas) return;

  if (selectedIds.length === 0) {
    suppressSelectionEventsRef.current = true;
    try {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    } finally {
      queueMicrotask(() => {
        suppressSelectionEventsRef.current = false;
      });
    }
    return;
  }

  const targets = selectedIds
    .map((id) => findFabricObjectByElementId(canvas, id))
    .filter((x): x is FabricObject => Boolean(x));

  suppressSelectionEventsRef.current = true;
  try {
    if (targets.length === 1) {
      canvas.setActiveObject(targets[0]!);
    } else if (targets.length > 1) {
      const sel = new ActiveSelection(targets, { canvas });
      canvas.setActiveObject(sel);
    }
    canvas.requestRenderAll();
  } finally {
    queueMicrotask(() => {
      suppressSelectionEventsRef.current = false;
    });
  }
}
