"use client";

import { FabricObject } from "fabric";

let applied = false;

/**
 * Defaults de rendimiento para objetos Fabric (una sola vez por bundle).
 * `objectCaching` rasteriza en cache off-screen → menos repaints en transforms.
 */
export function applyFabricPerformanceDefaults(): void {
  if (applied) return;
  applied = true;
  Object.assign(FabricObject.prototype, { objectCaching: true });
}
