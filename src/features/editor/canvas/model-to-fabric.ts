"use client";

import type { CanvasElement, EditorCanvas } from "@/entities/editor/document-schema";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import {
  normalizeTextElement,
  toCanvasFontCSS,
} from "@/entities/editor/text-typography";
import type { Canvas, FabricObject } from "fabric";
import { FabricImage, FabricText, IText } from "fabric";

import { applyImageEffectsToFabricImage } from "./image-effects-bridge";
import { getFabricElementId } from "./fabric-element-id";

// ── Snapshot cache para diff incremental ──────────────────────
// Guarda el último estado aplicado por elemento para evitar
// pisar transforms que Fabric ya actualizó localmente.
const elementSnapshotCache = new WeakMap<FabricObject, string>();

function snapshotKey(el: CanvasElement): string {
  return JSON.stringify({
    x: el.transform.x,
    y: el.transform.y,
    r: el.transform.rotation,
    sx: el.transform.scaleX,
    sy: el.transform.scaleY,
    op: el.opacity,
    vis: el.visible,
    lock: el.locked,
  });
}

function mapTextAlign(
  align: (CanvasElement & { type: "text" })["textAlign"],
): "left" | "center" | "right" | "justify" | "justify-left" {
  return align === "justify" ? "justify-left" : align;
}

export function applyCanvasLayoutToFabric(
  canvas: Canvas,
  layout: Pick<EditorCanvas, "width" | "height" | "backgroundColor">,
) {
  canvas.setDimensions({ width: layout.width, height: layout.height });
  canvas.backgroundColor = layout.backgroundColor;
}

export function fabricImageSrcMatches(img: FabricImage, src: string): boolean {
  return img.getSrc() === src;
}

/**
 * Actualiza un objeto Fabric existente desde el modelo de forma INCREMENTAL.
 *
 * REGLA CRÍTICA: si el snapshot del transform no cambió desde la última
 * aplicación, NO se reaplicam left/top/scaleX/scaleY para evitar pisar
 * transforms que Fabric actualizó localmente (drag, resize, rotate).
 *
 * Solo se fuerza la reaplicación cuando:
 * - El objeto es nuevo (no tiene snapshot previo)
 * - El modelo cambió explícitamente (undo/redo, realtime sync)
 */
export function applyElementModelToFabricObject(
  obj: FabricObject,
  el: CanvasElement,
  options: { forceTransform?: boolean } = {},
): { needsCoords: boolean } {
  const id = getFabricElementId(obj);
  if (!id || id !== el.id) return { needsCoords: false };

  const newSnapshot = snapshotKey(el);
  const prevSnapshot = elementSnapshotCache.get(obj);
  const transformChanged = prevSnapshot !== newSnapshot;
  const shouldApplyTransform = options.forceTransform || transformChanged;

  // ── Props NO relacionadas al transform (siempre seguras) ──
  obj.set({
    opacity: el.opacity,
    visible: el.visible,
    selectable: !el.locked,
    evented: !el.locked,
  });

  // ── Transform: solo si cambió en el modelo ────────────────
  if (shouldApplyTransform) {
    obj.set({
      left: el.transform.x,
      top: el.transform.y,
      angle: el.transform.rotation,
      scaleX: el.transform.scaleX,
      scaleY: el.transform.scaleY,
      originX: el.transform.originX,
      originY: el.transform.originY,
    });
    elementSnapshotCache.set(obj, newSnapshot);
  }

  // ── Texto ─────────────────────────────────────────────────
  if (isTextElement(el) && (obj instanceof IText || obj instanceof FabricText)) {
    const t = normalizeTextElement(el);

    // Solo aplicar width si está definido y cambió
    const widthProps =
      typeof t.width === "number"
        ? { width: t.width }
        : {};

    obj.set({
      text: t.text,
      fontFamily: toCanvasFontCSS(t),
      fontSize: t.fontSize,
      fontWeight: String(t.fontWeight),
      fill: t.fill,
      textAlign: mapTextAlign(t.textAlign),
      lineHeight: t.lineHeight,
      charSpacing: t.letterSpacing,
      ...widthProps,
    });
  }

  // ── Imagen ────────────────────────────────────────────────
  if (isImageElement(el) && obj instanceof FabricImage) {
    if (el.crop) {
      obj.set({
        cropX: el.crop.x,
        cropY: el.crop.y,
        width: el.crop.width,
        height: el.crop.height,
      });
    }
    obj.set({ lockScalingFlip: true });
    applyImageEffectsToFabricImage(obj, el);
  }

  return { needsCoords: shouldApplyTransform };
}

/**
 * Invalida el snapshot de un objeto Fabric.
 * Llamar cuando el modelo fue actualizado explícitamente desde el store
 * (undo/redo, load, realtime) para forzar reaplicación del transform.
 */
export function invalidateFabricObjectSnapshot(obj: FabricObject): void {
  elementSnapshotCache.delete(obj);
}

/**
 * Invalida todos los snapshots del canvas.
 * Usar en carga inicial y undo/redo para garantizar sincronización total.
 */
export function invalidateAllFabricSnapshots(canvas: Canvas): void {
  for (const obj of canvas.getObjects()) {
    elementSnapshotCache.delete(obj);
  }
}