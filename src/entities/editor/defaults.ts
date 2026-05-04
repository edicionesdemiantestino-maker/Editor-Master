import { EDITOR_DOCUMENT_VERSION, type EditorDocument } from "./document-schema";

export function createElementId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyDocument(projectId: string): EditorDocument {
  const now = new Date().toISOString();
  return {
    version: EDITOR_DOCUMENT_VERSION,
    projectId,
    canvas: {
      width: 1080,
      height: 1350,
      backgroundColor: "#ffffff",
      elements: [],
    },
    meta: {
      title: "Sin título",
      updatedAt: now,
    },
  };
}
