"use client";

import type { Canvas, FabricObject } from "fabric";

export async function duplicateActiveObject(canvas: Canvas | null): Promise<void> {
  if (!canvas) return;
  const obj = canvas.getActiveObject() as FabricObject | undefined;
  if (!obj) return;
  const clone = await obj.clone();
  clone.set({
    left: (obj.left ?? 0) + 24,
    top: (obj.top ?? 0) + 24,
  });
  canvas.add(clone);
  canvas.setActiveObject(clone);
  canvas.requestRenderAll();
}

export function alignActiveTextObject(
  canvas: Canvas | null,
  align: "left" | "center" | "right",
): void {
  if (!canvas) return;
  const obj = canvas.getActiveObject() as { text?: unknown; set?: (k: Record<string, unknown>) => void } | null;
  if (!obj?.set) return;
  if (typeof obj.text === "undefined") return;
  obj.set({ textAlign: align });
  canvas.requestRenderAll();
}
