import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { CanvasElement, ElementId, EditorDocument } from "@/entities/editor/document-schema";
import { createEmptyDocument } from "@/entities/editor/defaults";

import {
  cloneDocument,
  removeElementFromDocument,
  updateElementInDocument,
} from "./document-mutations";

const DEFAULT_MAX_HISTORY = 40;

export type PresentUpdateMode = "commit" | "transient";

export type EditorHistory = {
  readonly past: readonly EditorDocument[];
  readonly present: EditorDocument;
  readonly future: readonly EditorDocument[];
};

function touchMeta(doc: EditorDocument): EditorDocument {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      updatedAt: new Date().toISOString(),
    },
  };
}

function trimPast(
  past: readonly EditorDocument[],
  max: number,
): readonly EditorDocument[] {
  if (past.length <= max) return past;
  return past.slice(past.length - max);
}

function pruneSelectedIds(
  present: EditorDocument,
  selectedIds: ElementId[],
): ElementId[] {
  const allowed = new Set(present.canvas.elements.map((e) => e.id));
  return selectedIds.filter((id) => allowed.has(id));
}

type EditorState = EditorHistory & {
  maxHistory: number;
  selectedIds: ElementId[];
  isApplyingHistory: boolean;
  skipNextFabricResync: boolean;
  /** Versión lógica del timeline (UI: undo/redo habilitado). */
  historyRevision: number;

  addElement: (element: CanvasElement) => void;
  updateElement: (
    id: ElementId,
    patch: Partial<CanvasElement>,
    options?: { recordHistory?: boolean },
  ) => void;
  deleteElement: (id: ElementId) => void;
  /**
   * Reemplaza el documento presente (p. ej. sync masivo desde Fabric).
   * `commit` = nueva rama de historial; `transient` = mismo paso de undo.
   */
  replacePresent: (next: EditorDocument, mode: PresentUpdateMode) => void;

  select: (ids: ElementId[]) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markFabricMutationStart: () => void;
  consumeFabricResyncSkip: () => boolean;
  /** Captura el present en `past` sin mutarlo (sesión de edición de texto, etc.). */
  pushHistoryAnchor: () => void;
};

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    past: [],
    present: createEmptyDocument("local"),
    future: [],
    maxHistory: DEFAULT_MAX_HISTORY,
    selectedIds: [],
    isApplyingHistory: false,
    skipNextFabricResync: false,
    historyRevision: 0,

    addElement: (element) => {
      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        present: touchMeta({
          ...s.present,
          canvas: {
            ...s.present.canvas,
            elements: [...s.present.canvas.elements, element],
          },
        }),
        future: [],
        historyRevision: s.historyRevision + 1,
      }));
    },

    updateElement: (id, patch, options) => {
      const recordHistory = options?.recordHistory !== false;
      const { present } = get();
      if (!present.canvas.elements.some((e) => e.id === id)) return;

      const nextPresent = touchMeta(
        updateElementInDocument(present, id, patch),
      );

      if (!recordHistory) {
        set({ present: nextPresent });
        return;
      }

      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        present: nextPresent,
        future: [],
        historyRevision: s.historyRevision + 1,
      }));
    },

    deleteElement: (id) => {
      set((s) => {
        if (!s.present.canvas.elements.some((e) => e.id === id)) return s;
        const nextPresent = touchMeta(removeElementFromDocument(s.present, id));
        return {
          past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
          present: nextPresent,
          future: [],
          selectedIds: s.selectedIds.filter((x) => x !== id),
          historyRevision: s.historyRevision + 1,
        };
      });
    },

    replacePresent: (next, mode) => {
      const frozen = cloneDocument(next);
      if (mode === "transient") {
        set({ present: touchMeta(frozen) });
        return;
      }
      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        present: touchMeta(frozen),
        future: [],
        historyRevision: s.historyRevision + 1,
      }));
    },

    select: (ids) => set({ selectedIds: ids }),
    clearSelection: () => set({ selectedIds: [] }),

    undo: () => {
      set((s) => {
        if (s.past.length === 0) return s;
        const previous = s.past[s.past.length - 1]!;
        const newPast = s.past.slice(0, -1);
        const newFuture = [cloneDocument(s.present), ...s.future];
        const nextPresent = cloneDocument(previous);
        return {
          past: newPast,
          present: nextPresent,
          future: newFuture,
          selectedIds: pruneSelectedIds(nextPresent, s.selectedIds),
          isApplyingHistory: true,
          historyRevision: s.historyRevision + 1,
        };
      });
      queueMicrotask(() => set({ isApplyingHistory: false }));
    },

    redo: () => {
      set((s) => {
        if (s.future.length === 0) return s;
        const [next, ...restFuture] = s.future;
        const newPast = [...s.past, cloneDocument(s.present)];
        const nextPresent = cloneDocument(next);
        return {
          past: newPast,
          present: nextPresent,
          future: restFuture,
          selectedIds: pruneSelectedIds(nextPresent, s.selectedIds),
          isApplyingHistory: true,
          historyRevision: s.historyRevision + 1,
        };
      });
      queueMicrotask(() => set({ isApplyingHistory: false }));
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    markFabricMutationStart: () => set({ skipNextFabricResync: true }),

    consumeFabricResyncSkip: () => {
      if (!get().skipNextFabricResync) return false;
      set({ skipNextFabricResync: false });
      return true;
    },

    pushHistoryAnchor: () =>
      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        future: [],
        historyRevision: s.historyRevision + 1,
      })),
  })),
);

export function resetEditorForProject(projectId: string) {
  useEditorStore.setState({
    past: [],
    present: createEmptyDocument(projectId),
    future: [],
    selectedIds: [],
    isApplyingHistory: false,
    skipNextFabricResync: false,
    historyRevision: 0,
  });
}

/** Reemplaza el documento (p. ej. carga desde Supabase) y reinicia historial. */
export function loadEditorDocument(doc: EditorDocument) {
  useEditorStore.setState((s) => ({
    past: [],
    present: cloneDocument(doc),
    future: [],
    selectedIds: [],
    isApplyingHistory: false,
    skipNextFabricResync: false,
    historyRevision: s.historyRevision + 1,
  }));
}
