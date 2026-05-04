import type { Canvas } from "fabric";

/**
 * Carga un snapshot serializado de Fabric en el **canvas existente**.
 * Uso previsto: importación / herramientas avanzadas; el flujo principal del editor
 * sigue hidratando desde el {@link EditorDocument} canónico + reconcile.
 */
export async function loadFabricJsonOntoCanvas(
  canvas: Canvas,
  json: Record<string, unknown>,
): Promise<void> {
  await canvas.loadFromJSON(json);
  canvas.requestRenderAll();
}
