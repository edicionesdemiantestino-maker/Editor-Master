"use client";

import type { FabricObject } from "fabric";

/** Clave interna para enlazar objetos Fabric ↔ modelo (no serializar a Supabase). */
export const FABRIC_ELEMENT_ID_KEY = "__editorElementId" as const;

export function setFabricElementId(obj: FabricObject, id: string) {
  (obj as unknown as Record<string, string>)[FABRIC_ELEMENT_ID_KEY] = id;
}

export function getFabricElementId(obj: FabricObject): string | undefined {
  return (obj as unknown as Record<string, string | undefined>)[
    FABRIC_ELEMENT_ID_KEY
  ];
}

export function findFabricObjectByElementId(
  canvas: import("fabric").Canvas,
  elementId: string,
): FabricObject | undefined {
  return canvas.getObjects().find((o) => getFabricElementId(o) === elementId);
}
