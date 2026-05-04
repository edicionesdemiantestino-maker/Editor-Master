import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/entities/editor/defaults";
import {
  loadEditorDocument,
  resetEditorForProject,
  useEditorStore,
} from "@/features/editor/store/editor-store";
import { createDefaultTextElement } from "@/features/editor/store/document-mutations";

describe("useEditorStore (Zustand)", () => {
  beforeEach(() => {
    resetEditorForProject("vitest-store");
  });

  it("undo restaura el documento previo y redo lo vuelve a aplicar", () => {
    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(0);
    expect(useEditorStore.getState().canUndo()).toBe(false);

    const el = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(el);

    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(1);
    expect(useEditorStore.getState().past.length).toBeGreaterThan(0);
    expect(useEditorStore.getState().canUndo()).toBe(true);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(0);
    expect(useEditorStore.getState().canRedo()).toBe(true);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(1);
    expect(useEditorStore.getState().present.canvas.elements[0]!.id).toBe(el.id);
  });

  it("updateElement sin historial no agrega entrada en past", () => {
    const el = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(el);
    const pastAfterAdd = useEditorStore.getState().past.length;

    useEditorStore
      .getState()
      .updateElement(el.id, { text: "Editado" }, { recordHistory: false });
    expect(useEditorStore.getState().past.length).toBe(pastAfterAdd);
    expect(useEditorStore.getState().present.canvas.elements[0]?.text).toBe(
      "Editado",
    );
  });

  it("replacePresent en modo transient no agrega al historial", () => {
    const el = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(el);
    const pastLen = useEditorStore.getState().past.length;

    const next = structuredClone(useEditorStore.getState().present);
    next.meta = { ...next.meta, title: "Solo UI" };
    useEditorStore.getState().replacePresent(next, "transient");

    expect(useEditorStore.getState().past.length).toBe(pastLen);
    expect(useEditorStore.getState().present.meta.title).toBe("Solo UI");
  });

  it("replacePresent en modo commit agrega entrada al historial", () => {
    const el = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(el);
    const pastLen = useEditorStore.getState().past.length;

    const next = structuredClone(useEditorStore.getState().present);
    next.meta = { ...next.meta, title: "Commit" };
    useEditorStore.getState().replacePresent(next, "commit");

    expect(useEditorStore.getState().past.length).toBeGreaterThan(pastLen);
    expect(useEditorStore.getState().present.meta.title).toBe("Commit");
  });

  it("deleteElement elimina el elemento y lo saca de la selección", () => {
    const el = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(el);
    useEditorStore.getState().select([el.id]);

    useEditorStore.getState().deleteElement(el.id);

    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(0);
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  it("select y clearSelection actualizan selectedIds", () => {
    const a = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(a);
    const b = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(b);

    useEditorStore.getState().select([a.id, b.id]);
    expect(useEditorStore.getState().selectedIds).toEqual([a.id, b.id]);

    useEditorStore.getState().clearSelection();
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  it("pushHistoryAnchor agrega snapshot sin mutar elementos del present", () => {
    const el = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(el);
    const idsBefore = useEditorStore.getState().present.canvas.elements.map((e) => e.id);
    const pastBefore = useEditorStore.getState().past.length;

    useEditorStore.getState().pushHistoryAnchor();

    expect(useEditorStore.getState().present.canvas.elements.map((e) => e.id)).toEqual(
      idsBefore,
    );
    expect(useEditorStore.getState().past.length).toBeGreaterThan(pastBefore);
  });

  it("recorta past al máximo de historial (40) al agregar muchos elementos", () => {
    for (let i = 0; i < 45; i++) {
      const el = createDefaultTextElement(useEditorStore.getState().present);
      useEditorStore.getState().addElement(el);
    }
    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(45);
    expect(useEditorStore.getState().past.length).toBe(40);
  });

  it("undo con selección inválida poda ids que ya no existen", () => {
    const a = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(a);
    const b = createDefaultTextElement(useEditorStore.getState().present);
    useEditorStore.getState().addElement(b);
    useEditorStore.getState().select([a.id, b.id]);

    useEditorStore.getState().undo();

    expect(useEditorStore.getState().present.canvas.elements).toHaveLength(1);
    expect(useEditorStore.getState().selectedIds.every((id) =>
      useEditorStore.getState().present.canvas.elements.some((e) => e.id === id),
    )).toBe(true);
  });

  it("loadEditorDocument reinicia historial y present", () => {
    useEditorStore.getState().addElement(createDefaultTextElement(useEditorStore.getState().present));
    const doc = createEmptyDocument("remote-1");
    doc.meta.title = "Remoto";

    loadEditorDocument(doc);

    expect(useEditorStore.getState().past).toHaveLength(0);
    expect(useEditorStore.getState().future).toHaveLength(0);
    expect(useEditorStore.getState().present.projectId).toBe("remote-1");
    expect(useEditorStore.getState().present.meta.title).toBe("Remoto");
  });
});
