import type { Canvas } from "fabric";

const rafByCanvas = new WeakMap<Canvas, number>();

/**
 * Agrupa varios `requestRenderAll` en un solo frame (útil durante drag/scale).
 * Fabric ya repinta en muchos eventos; esto evita encadenar renders síncronos extra.
 */
export function scheduleFabricRender(canvas: Canvas | null): void {
  if (!canvas) return;
  const prev = rafByCanvas.get(canvas);
  if (prev != null) cancelAnimationFrame(prev);
  const id = requestAnimationFrame(() => {
    rafByCanvas.delete(canvas);
    try {
      canvas.requestRenderAll();
    } catch {
      /* lienzo ya disposed */
    }
  });
  rafByCanvas.set(canvas, id);
}
