"use client";

import type { CanvasElement } from "@/entities/editor/document-schema";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import type { FabricObject } from "fabric";
import { ActiveSelection, FabricImage, FabricText, IText } from "fabric";

import {
  applyFabricTextProps,
  applyFabricTransformToElement,
} from "../store/document-mutations";

import { inferTextFontFromFabricCss } from "./fabric-text-sync";
import { pickUniformImageScale } from "./image-transform";

/**
 * Expande el target de un evento Fabric (incluye selección múltiple).
 */
export function expandFabricEventTargets(target: FabricObject): FabricObject[] {
  if (target instanceof ActiveSelection) {
    return target.getObjects();
  }
  return [target];
}

export function mergeFabricObjectIntoElement(
  el: CanvasElement,
  target: FabricObject,
): CanvasElement {
  const sx = target.scaleX ?? 1;
  const sy = target.scaleY ?? 1;
  const lockImage =
    isImageElement(el) && el.lockAspectRatio !== false && target instanceof FabricImage;
  const scaleX = lockImage ? pickUniformImageScale(sx, sy) : sx;
  const scaleY = lockImage ? pickUniformImageScale(sx, sy) : sy;

  let next = applyFabricTransformToElement(el, {
    left: target.left ?? 0,
    top: target.top ?? 0,
    scaleX,
    scaleY,
    angle: target.angle ?? 0,
    originX: (target.originX ?? "left") as CanvasElement["transform"]["originX"],
    originY: (target.originY ?? "top") as CanvasElement["transform"]["originY"],
  });

  if (isTextElement(next) && (target instanceof IText || target instanceof FabricText)) {
    const ff =
      typeof target.fontFamily === "string" ? target.fontFamily : undefined;
    next = applyFabricTextProps(
      next,
      {
        text: target.text,
        fontSize: target.fontSize,
        fill: typeof target.fill === "string" ? target.fill : undefined,
        fontFamily: ff,
        fontWeight: target.fontWeight,
        textAlign: typeof target.textAlign === "string" ? target.textAlign : undefined,
      },
      inferTextFontFromFabricCss,
    );
  }

  if (isImageElement(next) && target instanceof FabricImage) {
    const src = target.getSrc();
    if (src && src !== next.src) {
      next = { ...next, src };
    }
  }

  return next;
}
