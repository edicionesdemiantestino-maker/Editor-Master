"use client";

import { useMemo } from "react";
import { useEditorStore } from "../store/editor-store";
import { isTextElement, isImageElement } from "@/entities/editor/element-guards";
import { TextInspectorPanel } from "../text/text-inspector-panel";
import { ImageEffectsPanel } from "../canvas/image-effects-panel";
import { MagicErasePanel } from "../magic-erase/magic-erase-panel";

type ContextInspectorProps = {
  getCanvas: () => import("fabric").Canvas | null;
};

export function ContextInspector({ getCanvas }: ContextInspectorProps) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const present = useEditorStore((s) => s.present);

  const context = useMemo(() => {
    if (selectedIds.length === 0) return "empty";
    if (selectedIds.length > 1) return "multi";
    const el = present.canvas.elements.find((e) => e.id === selectedIds[0]);
    if (!el) return "empty";
    if (isTextElement(el)) return "text";
    if (isImageElement(el)) return "image";
    return "empty";
  }, [selectedIds, present.canvas.elements]);

  const selectedEl = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return present.canvas.elements.find((e) => e.id === selectedIds[0]) ?? null;
  }, [selectedIds, present.canvas.elements]);

  // ── Empty state ───────────────────────────────────────────
  if (context === "empty") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-2xl">
          ◈
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-400">
            Sin selección
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Seleccioná un elemento para editar sus propiedades
          </p>
        </div>
        <div className="mt-2 grid w-full grid-cols-2 gap-1.5">
          {[
            { icon: "T", label: "Texto", hint: "Clic en + Texto" },
            { icon: "▣", label: "Imagen", hint: "Clic en + Imagen" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/5 bg-white/3 px-3 py-2.5 text-center"
            >
              <div className="text-lg">{item.icon}</div>
              <div className="mt-0.5 text-[10px] font-medium text-zinc-500">
                {item.label}
              </div>
              <div className="text-[9px] text-zinc-700">{item.hint}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Multi selection ───────────────────────────────────────
  if (context === "multi") {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-xs font-bold text-indigo-400">
            {selectedIds.length}
          </span>
          <div>
            <p className="text-xs font-medium text-zinc-300">
              {selectedIds.length} elementos seleccionados
            </p>
            <p className="text-[10px] text-zinc-600">
              Acciones aplicadas a todos
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              const s = useEditorStore.getState();
              for (const id of [...s.selectedIds]) s.deleteElement(id);
            }}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
          >
            🗑 Eliminar selección
          </button>
          <button
            type="button"
            onClick={() => useEditorStore.getState().clearSelection()}
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/8"
          >
            ✕ Deseleccionar todo
          </button>
        </div>
      </div>
    );
  }

  // ── Text inspector ────────────────────────────────────────
  if (context === "text") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-500/10 text-[11px] font-bold text-indigo-400">
            T
          </span>
          <span className="text-xs font-medium text-zinc-300">
            Inspector de texto
          </span>
          {selectedEl && (
            <span className="ml-auto truncate text-[10px] text-zinc-600">
              {isTextElement(selectedEl)
                ? selectedEl.text.slice(0, 20)
                : ""}
            </span>
          )}
        </div>
        <TextInspectorPanel />
      </div>
    );
  }

  // ── Image inspector ───────────────────────────────────────
  if (context === "image") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-400">
            ▣
          </span>
          <span className="text-xs font-medium text-zinc-300">
            Inspector de imagen
          </span>
        </div>

        {/* Magic erase */}
        <div className="border-b border-white/5">
          <MagicErasePanel getCanvas={getCanvas} />
        </div>

        {/* Effects */}
        <ImageEffectsPanel />
      </div>
    );
  }

  return null;
}