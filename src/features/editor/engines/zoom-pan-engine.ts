import { Canvas, Point } from "fabric";

export type ZoomPanOptions = {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
};

const DEFAULT_OPTIONS: Required<ZoomPanOptions> = {
  minZoom: 0.05,
  maxZoom: 8,
  zoomStep: 0.1,
};

// ── Zoom hacia un punto ───────────────────────────────────────
export function zoomToPoint(
  canvas: Canvas,
  point: { x: number; y: number },
  delta: number,
  options: ZoomPanOptions = {},
): void {
  const { minZoom, maxZoom } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let zoom = canvas.getZoom();

  zoom *= 0.999 ** delta;

  zoom = Math.min(maxZoom, Math.max(minZoom, zoom));

  canvas.zoomToPoint(
    new Point(point.x, point.y),
    zoom,
  );

  canvas.requestRenderAll();
}

// ── Zoom absoluto centrado ────────────────────────────────────
export function setZoom(
  canvas: Canvas,
  targetZoom: number,
  options: ZoomPanOptions = {},
): void {
  const { minZoom, maxZoom } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const zoom = Math.min(
    maxZoom,
    Math.max(minZoom, targetZoom),
  );

  const center = canvas.getCenterPoint();

  canvas.zoomToPoint(center, zoom);

  canvas.requestRenderAll();
}

// ── Fit canvas al viewport ────────────────────────────────────
export function fitToScreen(canvas: Canvas): void {
  const containerW =
    (canvas.getElement().parentElement?.clientWidth ??
      800) - 64;

  const containerH =
    (canvas.getElement().parentElement?.clientHeight ??
      600) - 64;

  const cW = canvas.width ?? 800;
  const cH = canvas.height ?? 600;

  const scaleX = containerW / cW;
  const scaleY = containerH / cH;

  const zoom = Math.min(scaleX, scaleY, 1);

  const centerX = containerW / 2;
  const centerY = containerH / 2;

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

  canvas.zoomToPoint(
    new Point(cW / 2, cH / 2),
    zoom,
  );

  const vpt = canvas.viewportTransform ?? [
    1, 0, 0, 1, 0, 0,
  ];

  vpt[4] = centerX - (cW * zoom) / 2;
  vpt[5] = centerY - (cH * zoom) / 2;

  canvas.setViewportTransform(vpt);

  canvas.requestRenderAll();
}

// ── Reset zoom ────────────────────────────────────────────────
export function resetZoom(canvas: Canvas): void {
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

  canvas.requestRenderAll();
}

// ── Pan (mover viewport) ──────────────────────────────────────
export function panCanvas(
  canvas: Canvas,
  dx: number,
  dy: number,
): void {
  const vpt = canvas.viewportTransform ?? [
    1, 0, 0, 1, 0, 0,
  ];

  vpt[4] += dx;
  vpt[5] += dy;

  canvas.setViewportTransform(vpt);

  canvas.requestRenderAll();
}

// ── Presets de zoom ───────────────────────────────────────────
export const ZOOM_PRESETS = [
  { label: "10%", value: 0.1 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
  { label: "300%", value: 3 },
] as const;

// ── Obtener zoom actual en % ──────────────────────────────────
export function getZoomPercent(
  canvas: Canvas,
): number {
  return Math.round(canvas.getZoom() * 100);
}