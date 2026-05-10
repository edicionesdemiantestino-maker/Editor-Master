import type { Canvas, FabricObject } from "fabric";
import { getFabricElementId } from "../canvas/fabric-element-id";
import { useEditorStore } from "../store/editor-store";
import type { CanvasElement } from "@/entities/editor/document-schema";

// ── Tipos ────────────────────────────────────────────────────
export type AlignDirection =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

export type DistributeDirection = "horizontal" | "vertical";

export type AlignTarget = "selection" | "canvas";

// ── Obtener objetos seleccionados del canvas ──────────────────
function getSelectedObjects(canvas: Canvas): FabricObject[] {
  const active = canvas.getActiveObject();
  if (!active) return [];
  if ("getObjects" in active && typeof active.getObjects === "function") {
    return active.getObjects() as FabricObject[];
  }
  return [active];
}

// ── Bounding box de un conjunto de objetos ───────────────────
function getBoundingBox(objects: FabricObject[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    const br = obj.getBoundingRect();
    minX = Math.min(minX, br.left);
    minY = Math.min(minY, br.top);
    maxX = Math.max(maxX, br.left + br.width);
    maxY = Math.max(maxY, br.top + br.height);
  }

  return { left: minX, top: minY, right: maxX, bottom: maxY, width: maxX - minX, height: maxY - minY };
}

// ── Alinear objetos ───────────────────────────────────────────
export function alignObjects(
  canvas: Canvas,
  direction: AlignDirection,
  target: AlignTarget = "selection",
): void {
  const objects = getSelectedObjects(canvas);
  if (objects.length === 0) return;

  const canvasW = canvas.width ?? 0;
  const canvasH = canvas.height ?? 0;
  const bbox = getBoundingBox(objects);
  const ref = target === "canvas"
    ? { left: 0, top: 0, right: canvasW, bottom: canvasH, width: canvasW, height: canvasH }
    : bbox;

  for (const obj of objects) {
    const br = obj.getBoundingRect();
    const w = br.width;
    const h = br.height;

    switch (direction) {
      case "left":
        obj.set({ left: ref.left + (obj.left - br.left) });
        break;
      case "center-h":
        obj.set({ left: ref.left + ref.width / 2 - w / 2 + (obj.left - br.left) });
        break;
      case "right":
        obj.set({ left: ref.right - w + (obj.left - br.left) });
        break;
      case "top":
        obj.set({ top: ref.top + (obj.top - br.top) });
        break;
      case "center-v":
        obj.set({ top: ref.top + ref.height / 2 - h / 2 + (obj.top - br.top) });
        break;
      case "bottom":
        obj.set({ top: ref.bottom - h + (obj.top - br.top) });
        break;
    }

    obj.setCoords();
  }

  canvas.requestRenderAll();
  syncAlignmentToStore(canvas, objects);
}

// ── Distribuir objetos equitativamente ───────────────────────
export function distributeObjects(
  canvas: Canvas,
  direction: DistributeDirection,
): void {
  const objects = getSelectedObjects(canvas);
  if (objects.length < 3) return;

  const sorted = [...objects].sort((a, b) => {
    const ba = a.getBoundingRect();
    const bb = b.getBoundingRect();
    return direction === "horizontal"
      ? ba.left - bb.left
      : ba.top - bb.top;
  });

  const first = sorted[0]!.getBoundingRect();
  const last = sorted[sorted.length - 1]!.getBoundingRect();

  const totalSize = sorted.reduce((sum, obj) => {
    const br = obj.getBoundingRect();
    return sum + (direction === "horizontal" ? br.width : br.height);
  }, 0);

  const containerSize = direction === "horizontal"
    ? last.left + last.width - first.left
    : last.top + last.height - first.top;

  const gap = (containerSize - totalSize) / (sorted.length - 1);
  let cursor = direction === "horizontal" ? first.left : first.top;

  for (const obj of sorted) {
    const br = obj.getBoundingRect();
    if (direction === "horizontal") {
      obj.set({ left: cursor + (obj.left - br.left) });
      cursor += br.width + gap;
    } else {
      obj.set({ top: cursor + (obj.top - br.top) });
      cursor += br.height + gap;
    }
    obj.setCoords();
  }

  canvas.requestRenderAll();
  syncAlignmentToStore(canvas, objects);
}

// ── Sincronizar posiciones al store ───────────────────────────
function syncAlignmentToStore(canvas: Canvas, objects: FabricObject[]): void {
  const store = useEditorStore.getState();
  store.pushHistoryAnchor();

  let doc = store.present;
  for (const obj of objects) {
    const id = getFabricElementId(obj);
    if (!id) continue;
    doc = {
      ...doc,
      canvas: {
        ...doc.canvas,
        elements: doc.canvas.elements.map((el): CanvasElement =>
          el.id === id
            ? {
                ...el,
                transform: {
                  ...el.transform,
                  x: obj.left ?? el.transform.x,
                  y: obj.top ?? el.transform.y,
                },
              }
            : el,
        ),
      },
    };
  }

  store.replacePresent(doc, "commit");
}