"use client";

import type { ImageElement } from "@/entities/editor/document-schema";
import type { FabricImage } from "fabric";

/**
 * Aplica `effects.pipeline` al objeto Fabric.
 * Hoy es no-op salvo recorrido; futuro: mapear a `fabric.filters` y `applyFilters()`.
 */
export function applyImageEffectsToFabricImage(
  _img: FabricImage,
  element: Pick<ImageElement, "effects">,
): void {
  for (const stage of element.effects.pipeline) {
    switch (stage.kind) {
      case "noop":
        break;
      default:
        break;
    }
  }
}
