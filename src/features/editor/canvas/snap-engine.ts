"use client";

import type { Canvas, FabricObject } from "fabric";
import { getFabricElementId } from "./fabric-element-id";

export type SnapGuide = {
  type: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
};

export type SnapResult = {
  left: number;
  top: number;
  guides: SnapGuide[];
};

const SNAP_TOLERANCE = 6;
const SNAP_TO_CANVAS_TOLERANCE = 8;

type ObjectBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

function getBounds(obj: FabricObject): ObjectBounds {
  const br = obj.getBoundingRect();
  return {
    left: br.left,
    top: br.top,
    right: br.left + br.width,
    bottom: br.top + br.height,
    centerX: br.left + br.width / 2,
    centerY: br.top + br.height / 2,
    width: br.width,
    height: br.height,
  };
}

export function computeSnapResult(
  canvas: Canvas,
  movingObj: FabricObject,
  rawLeft: number,
  rawTop: number,
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedLeft = rawLeft;
  let snappedTop = rawTop;

  const br = movingObj.getBoundingRect();
  const objW = br.width;
  const objH = br.height;

  // Posición tentativa del objeto en movimiento
  const tentLeft = rawLeft;
  const tentRight = rawLeft + objW;
  const tentCX = rawLeft + objW / 2;
  const tentTop = rawTop;
  const tentBottom = rawTop + objH;
  const tentCY = rawTop + objH / 2;

  const canvasW = canvas.width ?? 0;
  const canvasH = canvas.height ?? 0;
  const movingId = getFabricElementId(movingObj);

  // ── 1. Snap al canvas ─────────────────────────────────────
  // Borde izquierdo
  if (Math.abs(tentLeft) <= SNAP_TO_CANVAS_TOLERANCE) {
    snappedLeft = 0;
    guides.push({ type: "vertical", position: 0, start: 0, end: canvasH });
  }
  // Borde derecho
  if (Math.abs(tentRight - canvasW) <= SNAP_TO_CANVAS_TOLERANCE) {
    snappedLeft = canvasW - objW;
    guides.push({ type: "vertical", position: canvasW, start: 0, end: canvasH });
  }
  // Centro horizontal
  if (Math.abs(tentCX - canvasW / 2) <= SNAP_TO_CANVAS_TOLERANCE) {
    snappedLeft = canvasW / 2 - objW / 2;
    guides.push({ type: "vertical", position: canvasW / 2, start: 0, end: canvasH });
  }
  // Borde superior
  if (Math.abs(tentTop) <= SNAP_TO_CANVAS_TOLERANCE) {
    snappedTop = 0;
    guides.push({ type: "horizontal", position: 0, start: 0, end: canvasW });
  }
  // Borde inferior
  if (Math.abs(tentBottom - canvasH) <= SNAP_TO_CANVAS_TOLERANCE) {
    snappedTop = canvasH - objH;
    guides.push({ type: "horizontal", position: canvasH, start: 0, end: canvasW });
  }
  // Centro vertical
  if (Math.abs(tentCY - canvasH / 2) <= SNAP_TO_CANVAS_TOLERANCE) {
    snappedTop = canvasH / 2 - objH / 2;
    guides.push({ type: "horizontal", position: canvasH / 2, start: 0, end: canvasW });
  }

  // ── 2. Snap a otros objetos ───────────────────────────────
  const others = canvas.getObjects().filter((o) => {
    if (o === movingObj) return false;
    const id = getFabricElementId(o);
    return id !== movingId;
  });

  for (const other of others) {
    const ob = getBounds(other);

    // Snap borde izquierdo del moving al borde izquierdo del other
    if (Math.abs(tentLeft - ob.left) <= SNAP_TOLERANCE) {
      snappedLeft = ob.left;
      guides.push({
        type: "vertical",
        position: ob.left,
        start: Math.min(tentTop, ob.top),
        end: Math.max(tentBottom, ob.bottom),
      });
    }
    // Snap borde derecho del moving al borde derecho del other
    if (Math.abs(tentRight - ob.right) <= SNAP_TOLERANCE) {
      snappedLeft = ob.right - objW;
      guides.push({
        type: "vertical",
        position: ob.right,
        start: Math.min(tentTop, ob.top),
        end: Math.max(tentBottom, ob.bottom),
      });
    }
    // Snap borde izquierdo del moving al borde derecho del other
    if (Math.abs(tentLeft - ob.right) <= SNAP_TOLERANCE) {
      snappedLeft = ob.right;
      guides.push({
        type: "vertical",
        position: ob.right,
        start: Math.min(tentTop, ob.top),
        end: Math.max(tentBottom, ob.bottom),
      });
    }
    // Snap centro X
    if (Math.abs(tentCX - ob.centerX) <= SNAP_TOLERANCE) {
      snappedLeft = ob.centerX - objW / 2;
      guides.push({
        type: "vertical",
        position: ob.centerX,
        start: Math.min(tentTop, ob.top),
        end: Math.max(tentBottom, ob.bottom),
      });
    }
    // Snap borde superior del moving al borde superior del other
    if (Math.abs(tentTop - ob.top) <= SNAP_TOLERANCE) {
      snappedTop = ob.top;
      guides.push({
        type: "horizontal",
        position: ob.top,
        start: Math.min(tentLeft, ob.left),
        end: Math.max(tentRight, ob.right),
      });
    }
    // Snap borde inferior del moving al borde inferior del other
    if (Math.abs(tentBottom - ob.bottom) <= SNAP_TOLERANCE) {
      snappedTop = ob.bottom - objH;
      guides.push({
        type: "horizontal",
        position: ob.bottom,
        start: Math.min(tentLeft, ob.left),
        end: Math.max(tentRight, ob.right),
      });
    }
    // Snap borde superior del moving al borde inferior del other
    if (Math.abs(tentTop - ob.bottom) <= SNAP_TOLERANCE) {
      snappedTop = ob.bottom;
      guides.push({
        type: "horizontal",
        position: ob.bottom,
        start: Math.min(tentLeft, ob.left),
        end: Math.max(tentRight, ob.right),
      });
    }
    // Snap centro Y
    if (Math.abs(tentCY - ob.centerY) <= SNAP_TOLERANCE) {
      snappedTop = ob.centerY - objH / 2;
      guides.push({
        type: "horizontal",
        position: ob.centerY,
        start: Math.min(tentLeft, ob.left),
        end: Math.max(tentRight, ob.right),
      });
    }
  }

  return {
    left: snappedLeft,
    top: snappedTop,
    guides: deduplicateGuides(guides),
  };
}

function deduplicateGuides(guides: SnapGuide[]): SnapGuide[] {
  const seen = new Set<string>();
  return guides.filter((g) => {
    const key = `${g.type}-${Math.round(g.position)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}