"use client";

import type { CanvasElement } from "@/entities/editor/document-schema";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import {
  normalizeTextElement,
  toCanvasFontCSS,
} from "@/entities/editor/text-typography";
import type { Canvas, FabricImage, FabricObject } from "fabric";
import { FabricImage as FabricImageClass, IText } from "fabric";

import { applyImageEffectsToFabricImage } from "./image-effects-bridge";
import { setFabricElementId } from "./fabric-element-id";
import { resampleImageUrlForCanvasIfNeeded } from "./resample-image-url-for-canvas";

function mapTextAlign(
  align: (CanvasElement & { type: "text" })["textAlign"],
): "left" | "center" | "right" | "justify" | "justify-left" {
  return align === "justify" ? "justify-left" : align;
}

/**
 * Crea un `IText` editable alineado con {@link TextElement}.
 */
export function createFabricTextFromElement(el: CanvasElement): IText | null {
  if (!isTextElement(el)) return null;
  const t = normalizeTextElement(el);
  const textAlign = mapTextAlign(t.textAlign);
  return new IText(t.text, {
    objectCaching: true,
    left: t.transform.x,
    top: t.transform.y,
    angle: t.transform.rotation,
    scaleX: t.transform.scaleX,
    scaleY: t.transform.scaleY,
    originX: t.transform.originX,
    originY: t.transform.originY,
    opacity: t.opacity,
    visible: t.visible,
    selectable: !t.locked,
    evented: !t.locked,
    editable: !t.locked,
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

export async function createFabricImageFromElement(
  el: CanvasElement,
): Promise<FabricImage | null> {
  if (!isImageElement(el)) return null;
  let src = el.src;
  if (el.naturalWidth > 0 && el.naturalHeight > 0) {
    src = await resampleImageUrlForCanvasIfNeeded(
      el.src,
      el.naturalWidth,
      el.naturalHeight,
    );
  }
  const img = await FabricImageClass.fromURL(src, {
    crossOrigin: "anonymous",
  });
  img.set({
    objectCaching: true,
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
    lockScalingFlip: true,
  });
  applyImageEffectsToFabricImage(img, el);
  return img;
}

export async function createFabricObjectForElement(
  el: CanvasElement,
): Promise<FabricObject | null> {
  if (isTextElement(el)) {
    return createFabricTextFromElement(el);
  }
  if (isImageElement(el)) {
    return createFabricImageFromElement(el);
  }
  return null;
}

export async function buildFabricObjectsFromDocument(
  elements: CanvasElement[],
): Promise<FabricObject[]> {
  const out: FabricObject[] = [];
  for (const el of elements) {
    const o = await createFabricObjectForElement(el);
    if (o) {
      setFabricElementId(o, el.id);
      out.push(o);
    }
  }
  return out;
}

export function disposeCanvas(canvas: Canvas | null) {
  if (!canvas) return;
  canvas.dispose();
}
