import type { Canvas, FabricObject } from "fabric";
import { getFabricElementId } from "../canvas/fabric-element-id";
import { useEditorStore } from "../store/editor-store";
import type { CanvasElement } from "@/entities/editor/document-schema";

// ── Flip horizontal ───────────────────────────────────────────
export function flipHorizontal(canvas: Canvas): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set({ flipX: !obj.flipX });
  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Flip vertical ─────────────────────────────────────────────
export function flipVertical(canvas: Canvas): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set({ flipY: !obj.flipY });
  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Rotar a ángulo específico ─────────────────────────────────
export function rotateTo(canvas: Canvas, angle: number): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set({ angle });
  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Rotar en incrementos ──────────────────────────────────────
export function rotateBy(canvas: Canvas, delta: number): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  const current = obj.angle ?? 0;
  const snapped = snapAngle(current + delta, 15);
  obj.set({ angle: snapped });
  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Snap de ángulo a múltiplos ────────────────────────────────
export function snapAngle(angle: number, snap = 45): number {
  const normalized = ((angle % 360) + 360) % 360;
  const snapped = Math.round(normalized / snap) * snap;
  return snapped % 360;
}

// ── Reset transform ───────────────────────────────────────────
export function resetTransform(canvas: Canvas): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set({
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    flipX: false,
    flipY: false,
    skewX: 0,
    skewY: 0,
  });
  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Scale proporcional ────────────────────────────────────────
export function scaleProportional(canvas: Canvas, factor: number): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  const current = obj.scaleX ?? 1;
  const next = Math.max(0.01, Math.min(20, current * factor));
  obj.set({ scaleX: next, scaleY: next });
  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Center en canvas ──────────────────────────────────────────
export function centerOnCanvas(
  canvas: Canvas,
  axis: "both" | "horizontal" | "vertical" = "both",
): void {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  const cW = canvas.width ?? 0;
  const cH = canvas.height ?? 0;
  const br = obj.getBoundingRect();

  if (axis === "both" || axis === "horizontal") {
    obj.set({ left: cW / 2 - br.width / 2 + (obj.left - br.left) });
  }
  if (axis === "both" || axis === "vertical") {
    obj.set({ top: cH / 2 - br.height / 2 + (obj.top - br.top) });
  }

  obj.setCoords();
  canvas.requestRenderAll();
  syncTransformToStore(canvas, obj);
}

// ── Sync al store ─────────────────────────────────────────────
function syncTransformToStore(canvas: Canvas, obj: FabricObject): void {
  const id = getFabricElementId(obj);
  if (!id) return;

  const store = useEditorStore.getState();
  const el = store.present.canvas.elements.find((e) => e.id === id);
  if (!el) return;

  const patch: Partial<CanvasElement> = {
    transform: {
      ...el.transform,
      x: obj.left ?? el.transform.x,
      y: obj.top ?? el.transform.y,
      rotation: obj.angle ?? el.transform.rotation,
      scaleX: obj.scaleX ?? el.transform.scaleX,
      scaleY: obj.scaleY ?? el.transform.scaleY,
    },
  };

  store.updateElement(id, patch, { recordHistory: true });
}

// ── Preset de rotaciones ──────────────────────────────────────
export const ROTATION_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315] as const;