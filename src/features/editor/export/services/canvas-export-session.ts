import type { Canvas, FabricObject } from "fabric";

/**
 * Aísla el estado visual del lienzo durante la exportación:
 * sin selección activa (controles / handles) para que `toDataURL` refleje solo el arte.
 */
export async function withFabricExportSession<T>(
  canvas: Canvas,
  run: () => T | Promise<T>,
): Promise<T> {
  const previousActive = canvas.getActiveObject() as FabricObject | undefined;
  canvas.discardActiveObject();
  canvas.requestRenderAll();

  try {
    return await run();
  } finally {
    if (previousActive) {
      canvas.setActiveObject(previousActive);
    }
    canvas.requestRenderAll();
  }
}
