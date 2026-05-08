"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "../store/editor-store";
import { isTextElement, isImageElement } from "@/entities/editor/element-guards";
import {
  reorderElementInDocument,
  moveElementToIndexInDocument,
  toggleElementLockInDocument,
  toggleElementVisibilityInDocument,
  updateElementInDocument,
} from "../store/document-mutations";
import type { CanvasElement } from "@/entities/editor/document-schema";

function getElementLabel(el: CanvasElement): string {
  if (isTextElement(el)) {
    return el.text.slice(0, 24) + (el.text.length > 24 ? "…" : "") || "(vacío)";
  }
  if (isImageElement(el)) return "🖼 Imagen";
  return "Elemento";
}

function getElementIcon(el: CanvasElement): string {
  if (isTextElement(el)) return "T";
  if (isImageElement(el)) return "▣";
  return "◈";
}

type DragState = {
  dragId: string;
  overId: string | null;
};

export function LayersPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragCounterRef = useRef(0);

  const elements = [...present.canvas.elements].reverse();

  const commit = (next: typeof present) => {
    useEditorStore.getState().pushHistoryAnchor();
    useEditorStore.getState().replacePresent(next, "commit");
  };

  const reorder = (id: string, dir: "up" | "down" | "front" | "back") => {
    commit(reorderElementInDocument(present, id, dir));
  };

  const toggleLock = (id: string) => {
    commit(toggleElementLockInDocument(present, id));
  };

  const toggleVisibility = (id: string) => {
    commit(toggleElementVisibilityInDocument(present, id));
  };

  const startRename = (el: CanvasElement) => {
    setEditingId(el.id);
    setEditingLabel(getElementLabel(el));
  };

  const commitRename = (id: string) => {
    if (isTextElement(present.canvas.elements.find((e) => e.id === id)!)) {
      const next = updateElementInDocument(present, id, {
        text: editingLabel || "Texto",
      } as Partial<CanvasElement>);
      commit(next);
    }
    setEditingId(null);
  };

  // ── Drag & drop ──────────────────────────────────────────
  const onDragStart = (id: string) => {
    setDrag({ dragId: id, overId: null });
  };

  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    setDrag((d) => (d ? { ...d, overId } : null));
  };

  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!drag || drag.dragId === targetId) {
      setDrag(null);
      return;
    }

    const allElements = present.canvas.elements;
    const fromIdx = allElements.findIndex((e) => e.id === drag.dragId);
    const toIdx = allElements.findIndex((e) => e.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      commit(moveElementToIndexInDocument(present, drag.dragId, toIdx));
    }
    setDrag(null);
  };

  const onDragEnd = () => setDrag(null);

  if (elements.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-xs text-zinc-600">
          El canvas está vacío.
          <br />Agregá texto o imágenes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {elements.length} {elements.length === 1 ? "capa" : "capas"}
        </span>
      </div>

      {/* Lista */}
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto py-1">
        {elements.map((el, reversedIdx) => {
          const realIdx = present.canvas.elements.length - 1 - reversedIdx;
          const selected = selectedIds.includes(el.id);
          const isDragging = drag?.dragId === el.id;
          const isOver = drag?.overId === el.id;

          return (
            <li
              key={el.id}
              draggable
              onDragStart={() => onDragStart(el.id)}
              onDragOver={(e) => onDragOver(e, el.id)}
              onDrop={(e) => onDrop(e, el.id)}
              onDragEnd={onDragEnd}
              className={`group relative flex items-center gap-1.5 px-2 py-1.5 transition-all ${
                isDragging ? "opacity-40" : ""
              } ${isOver ? "border-t-2 border-indigo-500" : ""} ${
                selected
                  ? "bg-indigo-600/15 text-indigo-300"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {/* Drag handle */}
              <span className="cursor-grab text-zinc-700 active:cursor-grabbing">
                ⠿
              </span>

              {/* Icono tipo */}
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                  isTextElement(el)
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {getElementIcon(el)}
              </span>

              {/* Label / rename */}
              {editingId === el.id ? (
                <input
                  autoFocus
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={() => commitRename(el.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(el.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 rounded border border-indigo-500 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  className="flex-1 truncate text-left text-xs"
                  onClick={() => useEditorStore.getState().select([el.id])}
                  onDoubleClick={() => startRename(el)}
                  title="Clic para seleccionar · Doble clic para renombrar"
                >
                  {getElementLabel(el)}
                </button>
              )}

              {/* Controles — visibles en hover o seleccionado */}
              <div
                className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
                  selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {/* Visibilidad */}
                <button
                  type="button"
                  onClick={() => toggleVisibility(el.id)}
                  title={el.visible ? "Ocultar" : "Mostrar"}
                  className="rounded p-1 text-[11px] hover:bg-zinc-700"
                >
                  {el.visible ? "👁" : "🙈"}
                </button>

                {/* Lock */}
                <button
                  type="button"
                  onClick={() => toggleLock(el.id)}
                  title={el.locked ? "Desbloquear" : "Bloquear"}
                  className="rounded p-1 text-[11px] hover:bg-zinc-700"
                >
                  {el.locked ? "🔒" : "🔓"}
                </button>

                {/* Subir capa */}
                <button
                  type="button"
                  onClick={() => reorder(el.id, "up")}
                  title="Subir capa"
                  disabled={realIdx === present.canvas.elements.length - 1}
                  className="rounded p-1 text-[10px] hover:bg-zinc-700 disabled:opacity-30"
                >
                  ↑
                </button>

                {/* Bajar capa */}
                <button
                  type="button"
                  onClick={() => reorder(el.id, "down")}
                  title="Bajar capa"
                  disabled={realIdx === 0}
                  className="rounded p-1 text-[10px] hover:bg-zinc-700 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Acciones rápidas si hay selección */}
      {selectedIds.length === 1 && (
        <div className="shrink-0 border-t border-zinc-800 p-2">
          <div className="flex gap-1">
            {[
              { label: "Frente", dir: "front" as const, title: "Traer al frente" },
              { label: "Fondo", dir: "back" as const, title: "Enviar al fondo" },
            ].map((action) => (
              <button
                key={action.dir}
                type="button"
                onClick={() => reorder(selectedIds[0]!, action.dir)}
                title={action.title}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 py-1.5 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}