import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

export function intersectSceneRects(
  a: InpaintSceneRect,
  b: InpaintSceneRect,
): InpaintSceneRect | null {
  const ax2 = a.left + a.width;
  const ay2 = a.top + a.height;
  const bx2 = b.left + b.width;
  const by2 = b.top + b.height;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(ax2, bx2);
  const bottom = Math.min(ay2, by2);
  const width = right - left;
  const height = bottom - top;
  if (width <= 1 || height <= 1) return null;
  return { left, top, width, height };
}

export function sceneRectFromTwoPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
): InpaintSceneRect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  return { left, top, width, height };
}
