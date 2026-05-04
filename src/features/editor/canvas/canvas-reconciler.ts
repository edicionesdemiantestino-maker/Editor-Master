"use client";

import type { CanvasElement, EditorDocument } from "@/entities/editor/document-schema";
import { FabricImage, type Canvas, type FabricObject } from "fabric";

import { getFabricElementId, setFabricElementId } from "./fabric-element-id";
import {
  applyCanvasLayoutToFabric,
  applyElementModelToFabricObject,
  fabricImageSrcMatches,
} from "./model-to-fabric";
import { createFabricObjectForElement } from "./object-factory";

export type ReconcileOptions = {
  /** Si devuelve true, se aborta el trabajo async pendiente (documento más nuevo). */
  isCancelled: () => boolean;
};

/**
 * Sincroniza el canvas Fabric con el documento sin recrear objetos innecesariamente.
 * - Elimina objetos huérfanos
 * - Recrea imágenes si cambió `src`
 * - Actualiza props en objetos existentes
 * - Reordena capas según `elements`
 * - Durante el batch usa `renderOnAddRemove = false` y un único `requestRenderAll`
 */
export async function reconcileFabricWithDocument(
  canvas: Canvas,
  document: EditorDocument,
  options: ReconcileOptions,
): Promise<void> {
  const board = document.canvas;
  const { elements } = board;

  const prevRenderOnAddRemove = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;

  try {
    applyCanvasLayoutToFabric(canvas, {
      width: board.width,
      height: board.height,
      backgroundColor: board.backgroundColor,
    });

    const docIds = new Set(elements.map((e) => e.id));

    for (const obj of [...canvas.getObjects()]) {
      const id = getFabricElementId(obj);
      if (id && !docIds.has(id)) {
        canvas.remove(obj);
      }
    }

    const fabricById = new Map<string, FabricObject>();
    for (const obj of canvas.getObjects()) {
      const id = getFabricElementId(obj);
      if (id) fabricById.set(id, obj);
    }

    for (const el of elements) {
      if (options.isCancelled()) return;

      let obj = fabricById.get(el.id);

      if (el.type === "image" && obj instanceof FabricImage) {
        if (!fabricImageSrcMatches(obj, el.src)) {
          canvas.remove(obj);
          fabricById.delete(el.id);
          obj = undefined;
        }
      }

      if (!obj) {
        const created = await createFabricObjectForElement(el);
        if (options.isCancelled()) return;
        if (!created) continue;
        setFabricElementId(created, el.id);
        canvas.add(created);
        fabricById.set(el.id, created);
        obj = created;
      } else {
        applyElementModelToFabricObject(obj, el);
        obj.setCoords();
      }
    }

    reorderFabricObjectsToMatchDocument(canvas, elements);
  } finally {
    canvas.renderOnAddRemove = prevRenderOnAddRemove;
    canvas.requestRenderAll();
  }
}

function reorderFabricObjectsToMatchDocument(
  canvas: Canvas,
  elements: CanvasElement[],
) {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;
    const obj = canvas
      .getObjects()
      .find((o) => getFabricElementId(o) === el.id);
    if (!obj) continue;
    canvas.moveObjectTo(obj, i);
  }
}
