import type { FabricImage } from "fabric";
import { Point, util } from "fabric";

import type {
  InpaintImagePixelROI,
  InpaintSceneRect,
} from "@/services/inpaint/inpaint-types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convierte un rectángulo en espacio de escena (canvas) a un ROI en píxeles
 * del bitmap de la imagen, usando la matriz de transformación del `FabricImage`.
 */
export function sceneRectToImagePixelRoi(
  img: FabricImage,
  sceneRect: InpaintSceneRect,
  naturalW: number,
  naturalH: number,
): InpaintImagePixelROI {
  const inv = util.invertTransform(img.calcTransformMatrix(true));
  const corners = [
    new Point(sceneRect.left, sceneRect.top),
    new Point(sceneRect.left + sceneRect.width, sceneRect.top),
    new Point(sceneRect.left + sceneRect.width, sceneRect.top + sceneRect.height),
    new Point(sceneRect.left, sceneRect.top + sceneRect.height),
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of corners) {
    const q = util.transformPoint(p, inv);
    minX = Math.min(minX, q.x);
    minY = Math.min(minY, q.y);
    maxX = Math.max(maxX, q.x);
    maxY = Math.max(maxY, q.y);
  }

  const x0 = clamp(Math.floor(minX), 0, Math.max(0, naturalW - 1));
  const y0 = clamp(Math.floor(minY), 0, Math.max(0, naturalH - 1));
  const x1 = clamp(Math.ceil(maxX), 0, naturalW);
  const y1 = clamp(Math.ceil(maxY), 0, naturalH);
  const w = clamp(x1 - x0, 1, naturalW - x0);
  const h = clamp(y1 - y0, 1, naturalH - y0);
  return { x: x0, y: y0, w, h };
}
