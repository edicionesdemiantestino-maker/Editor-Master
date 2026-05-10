"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useEditorStore } from "../store/editor-store";
import { createDefaultTextElement } from "../store/document-mutations";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: string;
  action: () => void;
  keywords?: string[];
};

type CommandMenuProps = {
  open: boolean;
  onClose: () => void;
  fabricCanvasGetter: () => import("fabric").Canvas | null;
  onExport?: () => void;
};

export function CommandMenu({
  open,
  onClose,
  fabricCanvasGetter,
  onExport,
}: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const commands = useMemo<CommandItem[]>(() => [
    // ── Insertar ──────────────────────────────────────────
    {
      id: "insert-text",
      label: "Insertar texto",
      description: "Agregar un bloque de texto al canvas",
      icon: "T",
      category: "Insertar",
      keywords: ["texto", "text", "agregar", "bloque"],
      action: () => {
        const s = useEditorStore.getState();
        s.addElement(createDefaultTextElement(s.present));
        onClose();
      },
    },
    {
      id: "insert-image",
      label: "Insertar imagen",
      description: "Subir imagen desde tu dispositivo",
      icon: "🖼",
      category: "Insertar",
      keywords: ["imagen", "image", "foto", "upload"],
      action: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.click();
        onClose();
      },
    },

    // ── Editar ────────────────────────────────────────────
    {
      id: "undo",
      label: "Deshacer",
      description: "Ctrl/Cmd + Z",
      icon: "↩",
      category: "Editar",
      keywords: ["undo", "deshacer", "atrás"],
      action: () => {
        useEditorStore.getState().undo();
        onClose();
      },
    },
    {
      id: "redo",
      label: "Rehacer",
      description: "Ctrl/Cmd + Y",
      icon: "↪",
      category: "Editar",
      keywords: ["redo", "rehacer"],
      action: () => {
        useEditorStore.getState().redo();
        onClose();
      },
    },
    {
      id: "select-all",
      label: "Seleccionar todo",
      description: "Selecciona todos los elementos del canvas",
      icon: "⬚",
      category: "Editar",
      keywords: ["select", "seleccionar", "all", "todo"],
      action: () => {
        const s = useEditorStore.getState();
        s.select(s.present.canvas.elements.map((e) => e.id));
        onClose();
      },
    },
    {
      id: "delete-selected",
      label: "Eliminar selección",
      description: "Elimina los elementos seleccionados",
      icon: "🗑",
      category: "Editar",
      keywords: ["delete", "eliminar", "borrar", "remove"],
      action: () => {
        const s = useEditorStore.getState();
        for (const id of [...s.selectedIds]) {
          s.deleteElement(id);
        }
        onClose();
      },
    },

    // ── Canvas ────────────────────────────────────────────
    {
      id: "zoom-fit",
      label: "Ajustar zoom al canvas",
      description: "Centrar y ajustar vista al documento",
      icon: "⊡",
      category: "Canvas",
      keywords: ["zoom", "fit", "ajustar", "centrar"],
      action: () => {
        const canvas = fabricCanvasGetter();
        if (canvas) {
          canvas.setZoom(1);
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          canvas.requestRenderAll();
        }
        onClose();
      },
    },
    {
      id: "zoom-in",
      label: "Zoom +",
      description: "Aumentar zoom",
      icon: "+",
      category: "Canvas",
      keywords: ["zoom", "in", "acercar", "aumentar"],
      action: () => {
        const canvas = fabricCanvasGetter();
        if (canvas) {
          canvas.setZoom(Math.min(canvas.getZoom() * 1.2, 5));
          canvas.requestRenderAll();
        }
        onClose();
      },
    },
    {
      id: "zoom-out",
      label: "Zoom -",
      description: "Reducir zoom",
      icon: "−",
      category: "Canvas",
      keywords: ["zoom", "out", "alejar", "reducir"],
      action: () => {
        const canvas = fabricCanvasGetter();
        if (canvas) {
          canvas.setZoom(Math.max(canvas.getZoom() * 0.8, 0.1));
          canvas.requestRenderAll();
        }
        onClose();
      },
    },

    // ── Exportar ──────────────────────────────────────────
    {
      id: "export",
      label: "Exportar diseño",
      description: "PNG, JPEG, PDF",
      icon: "↗",
      category: "Exportar",
      keywords: ["export", "exportar", "download", "descargar", "pdf", "png"],
      action: () => {
        onExport?.();
        onClose();
      },
    },

    // ── Capas ─────────────────────────────────────────────
    {
      id: "layer-front",
      label: "Traer al frente",
      description: "Mover capa seleccionada al frente",
      icon: "▲",
      category: "Capas",
      keywords: ["capa", "layer", "frente", "front", "arriba"],
      action: () => {
        const s = useEditorStore.getState();
        const id = s.selectedIds[0];
        if (!id) return;
        const elements = [...s.present.canvas.elements];
        const idx = elements.findIndex((e) => e.id === id);
        if (idx === -1) return;
        const [el] = elements.splice(idx, 1);
        elements.push(el!);
        s.replacePresent(
          { ...s.present, canvas: { ...s.present.canvas, elements } },
          "commit",
        );
        onClose();
      },
    },
    {
      id: "layer-back",
      label: "Enviar al fondo",
      description: "Mover capa seleccionada al fondo",
      icon: "▼",
      category: "Capas",
      keywords: ["capa", "layer", "fondo", "back", "abajo"],
      action: () => {
        const s = useEditorStore.getState();
        const id = s.selectedIds[0];
        if (!id) return;
        const elements = [...s.present.canvas.elements];
        const idx = elements.findIndex((e) => e.id === id);
        if (idx === -1) return;
        const [el] = elements.splice(idx, 1);
        elements.unshift(el!);
        s.replacePresent(
          { ...s.present, canvas: { ...s.present.canvas, elements } },
          "commit",
        );
        onClose();
      },
    },
  ], [fabricCanvasGetter, onClose, onExport]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.includes(q)),
    );
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of filtered) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category]!.push(cmd);
    }
    return groups;
  }, [filtered]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <span className="text-lg text-zinc-500">⌘</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar acciones, herramientas, capas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">
              Sin resultados para "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {category}
                </div>
                {items.map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={cmd.action}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-sm">
                      {cmd.icon}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-200">
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div className="text-[11px] text-zinc-600">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-white/8 px-4 py-2">
          <span className="text-[10px] text-zinc-600">
            ↑↓ navegar · Enter seleccionar · Esc cerrar
          </span>
        </div>
      </div>
    </div>
  );
}