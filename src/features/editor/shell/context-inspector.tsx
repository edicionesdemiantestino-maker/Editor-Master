"use client";

import { useMemo } from "react";
import { useEditorStore } from "../store/editor-store";
import { isTextElement, isImageElement } from "@/entities/editor/element-guards";
import { TextInspectorPanel } from "../text/text-inspector-panel";
import { ImageEffectsPanel } from "../canvas/image-effects-panel";
import { MagicErasePanel } from "../magic-erase/magic-erase-panel";
import {
  Section,
  EmptyState,
  PremiumButton,
  PanelDivider,
} from "@/lib/design-system/primitives";
import { surface, border, typography, motion } from "@/lib/design-system/tokens";

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
    return "shape";
  }, [selectedIds, present.canvas.elements]);

  const selectedEl = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return present.canvas.elements.find((e) => e.id === selectedIds[0]) ?? null;
  }, [selectedIds, present.canvas.elements]);

  // ── Empty ─────────────────────────────────────────────────
  if (context === "empty") {
    return (
      <div className="flex flex-1 flex-col">
        <EmptyState
          icon="◈"
          title="Sin selección"
          description="Seleccioná un elemento para editar sus propiedades"
          action={
            <div className="mt-1 flex flex-col gap-1.5 w-full">
              <PanelDivider label="Acciones rápidas" />
              <div className="grid grid-cols-2 gap-1 px-2">
                {[
                  { icon: "T", label: "Texto", hint: "⌘K → texto" },
                  { icon: "▣", label: "Imagen", hint: "⌘K → imagen" },
                  { icon: "▬", label: "Forma", hint: "⌘K → forma" },
                  { icon: "◫", label: "Capas", hint: "Tab izquierdo" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-1 rounded-lg py-2.5 px-2"
                    style={{
                      background: surface.glass,
                      border: border.subtle,
                      transition: `all ${motion.duration.fast}`,
                    }}
                  >
                    <span style={{ fontSize: "16px", opacity: 0.4 }}>
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontSize: typography.body.xs.size,
                        color: "rgba(255,255,255,0.25)",
                        fontWeight: "500",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.12)",
                      }}
                    >
                      {item.hint}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        {/* Canvas info */}
        <PanelDivider />
        <Section label="Documento" padded>
          <div className="flex flex-col gap-1.5">
            {[
              {
                label: "Dimensiones",
                value: `${present.canvas.width} × ${present.canvas.height}px`,
              },
              {
                label: "Elementos",
                value: String(present.canvas.elements.length),
              },
              {
                label: "Fondo",
                value: present.canvas.backgroundColor,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-0.5"
              >
                <span
                  style={{
                    fontSize: typography.body.xs.size,
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "ui-monospace, monospace",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  // ── Multi ─────────────────────────────────────────────────
  if (context === "multi") {
    return (
      <div className="flex flex-col gap-0">
        <Section label="Selección múltiple" padded>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
            style={{ background: "rgba(99,102,241,0.08)", border: "0.5px solid rgba(99,102,241,0.2)" }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "rgba(99,102,241,0.2)", color: "rgba(99,102,241,0.9)" }}
            >
              {selectedIds.length}
            </span>
            <div>
              <p style={{ fontSize: "11px", fontWeight: "500", color: "rgba(255,255,255,0.5)" }}>
                {selectedIds.length} elementos
              </p>
              <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>
                Acciones aplicadas a todos
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <PremiumButton
              variant="danger"
              onClick={() => {
                const s = useEditorStore.getState();
                for (const id of [...s.selectedIds]) s.deleteElement(id);
              }}
              className="w-full justify-start gap-2 px-3"
            >
              🗑 Eliminar selección
            </PremiumButton>
            <PremiumButton
              variant="ghost"
              onClick={() => useEditorStore.getState().clearSelection()}
              className="w-full justify-start gap-2 px-3"
            >
              ✕ Deseleccionar todo
            </PremiumButton>
          </div>
        </Section>
      </div>
    );
  }

  // ── Text ──────────────────────────────────────────────────
  if (context === "text") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Context header */}
        <div
          className="flex shrink-0 items-center gap-2 px-3 py-2"
          style={{ borderBottom: border.subtle }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
            style={{
              background: "rgba(99,102,241,0.15)",
              color: "rgba(99,102,241,0.8)",
              border: "0.5px solid rgba(99,102,241,0.25)",
            }}
          >
            T
          </span>
          <span style={{ fontSize: "11px", fontWeight: "500", color: "rgba(255,255,255,0.4)" }}>
            Texto
          </span>
          {selectedEl && isTextElement(selectedEl) && (
            <span
              className="ml-auto truncate max-w-[120px]"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}
            >
              {selectedEl.text.slice(0, 20)}
            </span>
          )}
          <PremiumButton
            variant="danger"
            size="sm"
            onClick={() => {
              const s = useEditorStore.getState();
              for (const id of [...s.selectedIds]) s.deleteElement(id);
            }}
            title="Eliminar"
          >
            🗑
          </PremiumButton>
        </div>
        <TextInspectorPanel />
      </div>
    );
  }

  // ── Image ─────────────────────────────────────────────────
  if (context === "image") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Context header */}
        <div
          className="flex shrink-0 items-center gap-2 px-3 py-2"
          style={{ borderBottom: border.subtle }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-[10px]"
            style={{
              background: "rgba(245,158,11,0.15)",
              color: "rgba(245,158,11,0.8)",
              border: "0.5px solid rgba(245,158,11,0.25)",
            }}
          >
            ▣
          </span>
          <span style={{ fontSize: "11px", fontWeight: "500", color: "rgba(255,255,255,0.4)" }}>
            Imagen
          </span>
          <PremiumButton
            variant="danger"
            size="sm"
            onClick={() => {
              const s = useEditorStore.getState();
              for (const id of [...s.selectedIds]) s.deleteElement(id);
            }}
            title="Eliminar"
            className="ml-auto"
          >
            🗑
          </PremiumButton>
        </div>

        {/* Magic erase */}
        <div style={{ borderBottom: border.subtle }}>
          <MagicErasePanel getCanvas={getCanvas} />
        </div>

        {/* Effects */}
        <ImageEffectsPanel />
      </div>
    );
  }

  // ── Shape ─────────────────────────────────────────────────
  if (context === "shape") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div
          className="flex shrink-0 items-center gap-2 px-3 py-2"
          style={{ borderBottom: border.subtle }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-[10px]"
            style={{
              background: "rgba(16,185,129,0.15)",
              color: "rgba(16,185,129,0.8)",
              border: "0.5px solid rgba(16,185,129,0.25)",
            }}
          >
            ◆
          </span>
          <span style={{ fontSize: "11px", fontWeight: "500", color: "rgba(255,255,255,0.4)" }}>
            Forma
          </span>
          <PremiumButton
            variant="danger"
            size="sm"
            onClick={() => {
              const s = useEditorStore.getState();
              for (const id of [...s.selectedIds]) s.deleteElement(id);
            }}
            title="Eliminar"
            className="ml-auto"
          >
            🗑
          </PremiumButton>
        </div>
        <EmptyState
          title="Forma seleccionada"
          description="Usá el toolbar superior para alinear, transformar y aplicar efectos"
        />
      </div>
    );
  }

  return null;
}