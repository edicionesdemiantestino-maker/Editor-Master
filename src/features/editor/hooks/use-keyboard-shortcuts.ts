"use client";

import { useEffect } from "react";
import type { Canvas } from "fabric";
import { useEditorStore } from "../store/editor-store";
import {
  addTextElement,
  cloneDocument,
} from "../store/document-mutations";
import { createElementId } from "@/entities/editor/defaults";

type KeyboardShortcutsOptions = {
  getCanvas: () => Canvas | null;
  enabled?: boolean;
};

function isEditingText(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (active as HTMLElement).isContentEditable
  );
}

function isModifier(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

export function useKeyboardShortcuts({
  getCanvas,
  enabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // No interceptar cuando el usuario está escribiendo en inputs
      if (isEditingText()) return;

      const mod = isModifier(e);
      const key = e.key.toLowerCase();
      const store = useEditorStore.getState();

      // ── Undo / Redo ──────────────────────────────────────
      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (store.canUndo()) store.undo();
        return;
      }

      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (store.canRedo()) store.redo();
        return;
      }

      // ── Duplicate (Cmd/Ctrl + D) ─────────────────────────
      if (mod && key === "d") {
        e.preventDefault();
        const { selectedIds, present } = store;
        if (selectedIds.length === 0) return;

        let doc = present;
        const newIds: string[] = [];

        for (const id of selectedIds) {
          const el = doc.canvas.elements.find((e) => e.id === id);
          if (!el) continue;
          const newId = createElementId();
          newIds.push(newId);
          const duplicated = {
            ...el,
            id: newId,
            transform: {
              ...el.transform,
              x: el.transform.x + 16,
              y: el.transform.y + 16,
            },
          };
          doc = {
            ...doc,
            canvas: {
              ...doc.canvas,
              elements: [...doc.canvas.elements, duplicated],
            },
          };
        }

        store.pushHistoryAnchor();
        store.replacePresent(doc, "commit");
        store.select(newIds);
        return;
      }

      // ── Delete / Backspace ───────────────────────────────
      if (key === "delete" || key === "backspace") {
        const { selectedIds } = store;
        if (selectedIds.length === 0) return;

        // No borrar si hay texto activo en Fabric
        const canvas = getCanvas();
        if (canvas) {
          const active = canvas.getActiveObject();
          if (active && "isEditing" in active && (active as any).isEditing) {
            return;
          }
        }

        e.preventDefault();
        store.pushHistoryAnchor();
        for (const id of [...selectedIds]) {
          store.deleteElement(id);
        }
        return;
      }

      // ── Select all (Cmd/Ctrl + A) ────────────────────────
      if (mod && key === "a") {
        e.preventDefault();
        const allIds = store.present.canvas.elements.map((el) => el.id);
        store.select(allIds);
        const canvas = getCanvas();
        if (canvas && allIds.length > 0) {
          const { ActiveSelection } = require("fabric");
          const objs = canvas.getObjects();
          if (objs.length > 0) {
            const sel = new ActiveSelection(objs, { canvas });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
          }
        }
        return;
      }

      // ── Escape — deseleccionar ───────────────────────────
      if (key === "escape") {
        store.clearSelection();
        const canvas = getCanvas();
        if (canvas) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
        return;
      }

      // ── Mover con flechas (1px, Shift = 10px) ────────────
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
      ) {
        const { selectedIds, present } = store;
        if (selectedIds.length === 0) return;
        e.preventDefault();

        const delta = e.shiftKey ? 10 : 1;
        const dx =
          key === "arrowleft" ? -delta : key === "arrowright" ? delta : 0;
        const dy =
          key === "arrowup" ? -delta : key === "arrowdown" ? delta : 0;

        let doc = present;
        for (const id of selectedIds) {
          const el = doc.canvas.elements.find((el) => el.id === id);
          if (!el) continue;
          doc = {
            ...doc,
            canvas: {
              ...doc.canvas,
              elements: doc.canvas.elements.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      transform: {
                        ...e.transform,
                        x: e.transform.x + dx,
                        y: e.transform.y + dy,
                      },
                    }
                  : e,
              ),
            },
          };
        }
        store.replacePresent(doc, "transient");
        return;
      }

      // ── Agregar texto (T) ────────────────────────────────
      if (key === "t" && !mod) {
        e.preventDefault();
        const { present } = store;
        const next = addTextElement(present);
        store.pushHistoryAnchor();
        store.replacePresent(next, "commit");
        return;
      }

      // ── Lock/unlock (Cmd/Ctrl + L) ───────────────────────
      if (mod && key === "l") {
        e.preventDefault();
        const { selectedIds, present } = store;
        if (selectedIds.length === 0) return;

        let doc = present;
        for (const id of selectedIds) {
          const el = doc.canvas.elements.find((e) => e.id === id);
          if (!el) continue;
          doc = {
            ...doc,
            canvas: {
              ...doc.canvas,
              elements: doc.canvas.elements.map((e) =>
                e.id === id ? { ...e, locked: !e.locked } : e,
              ),
            },
          };
        }
        store.replacePresent(doc, "commit");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getCanvas, enabled]);
}