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

function mapTextAlign(
  align: (CanvasElement & { type: "text" })["textAlign"],
): "left" | "center" | "right" | "justify" | "justify-left" {
  return align === "justify" ? "justify-left" : align;
}

/**
 * Aplica layout del documento al canvas (dimensiones y fondo).
 * El caller debe llamar `requestRenderAll` al cerrar el batch.
 */
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
 * Actualiza un objeto Fabric existente desde el modelo (sin recrear).
 * Para cambios de `src` en imágenes, el reconciler debe recrear el objeto.
 */
export function applyElementModelToFabricObject(
  obj: FabricObject,
  el: CanvasElement,
): { needsCoords: boolean } {
  const id = getFabricElementId(obj);
  if (!id || id !== el.id) {
    return { needsCoords: false };
  }

  obj.set({
    left: el.transform.x,
    top: el.transform.y,
    angle: el.transform.rotation,
    scaleX: el.transform.scaleX,
    scaleY: el.transform.scaleY,
    originX: el.transform.originX,
    originY: el.transform.originY,
    opacity: el.opacity,
    visible: el.visible,
    selectable: !el.locked,
    evented: !el.locked,
  });

  if (isTextElement(el) && (obj instanceof IText || obj instanceof FabricText)) {
    const t = normalizeTextElement(el);
    const textAlign = mapTextAlign(t.textAlign);
    obj.set({
      text: t.text,
      fontFamily: toCanvasFontCSS(t),
      fontSize: t.fontSize,
      fontWeight: String(t.fontWeight),
      fill: t.fill,
      textAlign,
      lineHeight: t.lineHeight,
      charSpacing: t.letterSpacing,
      ...(typeof t.width === "number" ? { width: t.width } : {}),
    });
  }

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

  return { needsCoords: true };
}
