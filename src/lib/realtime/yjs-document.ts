import * as Y from "yjs";
import type { CanvasElement } from "@/entities/editor/document-schema";

// ── Tipos del documento compartido ───────────────────────────
export type YCanvasElement = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  updatedAt: number;
  updatedBy: string;
};

export type YCollabMeta = {
  projectId: string;
  title: string;
  updatedAt: number;
};

// ── Estructura del Y.Doc ──────────────────────────────────────
export type EditorYDoc = {
  doc: Y.Doc;
  elements: Y.Map<YCanvasElement>;
  meta: Y.Map<unknown>;
  comments: Y.Array<unknown>;
};

// ── Crear Y.Doc para un proyecto ──────────────────────────────
export function createEditorYDoc(projectId: string): EditorYDoc {
  const doc = new Y.Doc();
  doc.clientID = hashProjectId(projectId);

  const elements = doc.getMap<YCanvasElement>("elements");
  const meta = doc.getMap<unknown>("meta");
  const comments = doc.getArray<unknown>("comments");

  meta.set("projectId", projectId);
  meta.set("updatedAt", Date.now());

  return { doc, elements, meta, comments };
}

// ── Convertir CanvasElement → YCanvasElement ─────────────────
export function elementToYjs(
  el: CanvasElement,
  userId: string,
): YCanvasElement {
  return {
    id: el.id,
    type: el.type,
    data: el as unknown as Record<string, unknown>,
    updatedAt: Date.now(),
    updatedBy: userId,
  };
}

// ── Convertir YCanvasElement → CanvasElement ─────────────────
export function yjsToElement(yEl: YCanvasElement): CanvasElement {
  return yEl.data as unknown as CanvasElement;
}

// ── Sync: Zustand → Yjs ──────────────────────────────────────
export function syncElementsToYjs(
  elements: CanvasElement[],
  yElements: Y.Map<YCanvasElement>,
  userId: string,
  doc: Y.Doc,
): void {
  doc.transact(() => {
    const currentIds = new Set(elements.map((e) => e.id));

    // Eliminar huérfanos
    for (const key of yElements.keys()) {
      if (!currentIds.has(key)) {
        yElements.delete(key);
      }
    }

    // Upsert elementos
    for (const el of elements) {
      const existing = yElements.get(el.id);
      const serialized = elementToYjs(el, userId);

      // Solo actualizar si cambió (evitar loops)
      if (
        !existing ||
        JSON.stringify(existing.data) !== JSON.stringify(el)
      ) {
        yElements.set(el.id, serialized);
      }
    }
  });
}

// ── Sync: Yjs → elementos ordenados ──────────────────────────
export function syncElementsFromYjs(
  yElements: Y.Map<YCanvasElement>,
  currentOrder: string[],
): CanvasElement[] {
  const byId = new Map<string, CanvasElement>();
  for (const [, yEl] of yElements) {
    byId.set(yEl.id, yjsToElement(yEl));
  }

  // Mantener orden del documento local, agregar nuevos al final
  const ordered: CanvasElement[] = [];
  for (const id of currentOrder) {
    const el = byId.get(id);
    if (el) {
      ordered.push(el);
      byId.delete(id);
    }
  }
  // Elementos nuevos del remoto
  for (const el of byId.values()) {
    ordered.push(el);
  }

  return ordered;
}

// ── Encode / Decode para persistencia ────────────────────────
export function encodeYDoc(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function applyYDocUpdate(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}

// ── Helper: hash determinístico del projectId → clientID ─────
function hashProjectId(projectId: string): number {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = ((hash << 5) - hash + projectId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 0xffffffff;
}