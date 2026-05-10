"use client";

import { useMemo, useEffect, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { isTextElement, isImageElement } from "@/entities/editor/element-guards";
import { alignActiveTextObject } from "../canvas/fabric-toolbar-actions";
import type { Canvas } from "fabric";
import {
  flipHorizontal,
  flipVertical,
  centerOnCanvas,
} from "../engines/transform-engine";

type FloatingToolbarProps = {
  getCanvas: () => Canvas | null;
};

type Position = { x: number; y: number };

export function FloatingToolbar({ getCanvas }: FloatingToolbarProps) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const present = useEditorStore((s) => s.present);
  const [pos, setPos] = useState<Position | null>(null);

  // Calcular posición basada en el objeto seleccionado en Fabric
  useEffect(() => {
    if (selectedIds.length === 0) {
      setPos(null);
      return;
    }

    const canvas = getCanvas();
    if (!canvas) return;

    const updatePos = () => {
      const active = canvas.getActiveObject();
      if (!active) {
        setPos(null);
        return;
      }

      const br = active.getBoundingRect();
      const canvasEl = canvas.getElement();
      const rect = canvasEl.getBoundingClientRect();
      const zoom = canvas.getZoom();
      const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];

      const screenX = rect.left + br.left + br.width / 2;
      const screenY = rect.top + br.top - 56;

      setPos({ x: screenX, y: Math.max(rect.top + 8, screenY) });
    };

    updatePos();

    canvas.on("object:moving", updatePos);
    canvas.on("object:scaling", updatePos);
    canvas.on("object:rotating", updatePos);
    canvas.on("selection:created", updatePos);
    canvas.on("selection:updated", updatePos);

    return () => {
      canvas.off("object:moving", updatePos);
      canvas.off("object:scaling", updatePos);
      canvas.off("object:rotating", updatePos);
      canvas.off("selection:created", updatePos);
      canvas.off("selection:updated", updatePos);
    };
  }, [selectedIds, getCanvas]);

  const context = useMemo(() => {
    if (selectedIds.length === 0) return null;
    if (selectedIds.length > 1) return "multi";
    const el = present.canvas.elements.find((e) => e.id === selectedIds[0]);
    if (!el) return null;
    if (isTextElement(el)) return "text";
    if (isImageElement(el)) return "image";
    return "shape";
  }, [selectedIds, present.canvas.elements]);

  if (!context || !pos) return null;

  const canvas = getCanvas();

  return (
    <div
      className="pointer-events-auto fixed z-[60] -translate-x-1/2 -translate-y-full"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl">

        {/* ── Texto ──────────────────────────────────────── */}
        {context === "text" && (
          <>
            <ToolbarGroup>
              <ToolbarBtn
                icon="≡"
                label="Alinear izquierda"
                onClick={() => canvas && alignActiveTextObject(canvas, "left")}
              />
              <ToolbarBtn
                icon="☰"
                label="Centrar"
                onClick={() => canvas && alignActiveTextObject(canvas, "center")}
              />
              <ToolbarBtn
                icon="≡"
                label="Alinear derecha"
                onClick={() => canvas && alignActiveTextObject(canvas, "right")}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <ToolbarBtn
                icon="B"
                label="Negrita"
                bold
                onClick={() => {
                  const s = useEditorStore.getState();
                  const id = s.selectedIds[0];
                  if (!id) return;
                  const el = s.present.canvas.elements.find((e) => e.id === id);
                  if (!el || !isTextElement(el)) return;
                  const w = Number(el.fontWeight);
                  s.updateElement(id, { fontWeight: w >= 700 ? 400 : 700 } as any, { recordHistory: true });
                }}
              />
              <ToolbarBtn
                icon="I"
                label="Cursiva"
                italic
                onClick={() => {}}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <ToolbarBtn icon="⊙" label="Centrar en canvas" onClick={() => canvas && centerOnCanvas(canvas)} />
            </ToolbarGroup>
          </>
        )}

        {/* ── Imagen ─────────────────────────────────────── */}
        {context === "image" && (
          <>
            <ToolbarGroup>
              <ToolbarBtn
                icon="↔"
                label="Flip horizontal"
                onClick={() => canvas && flipHorizontal(canvas)}
              />
              <ToolbarBtn
                icon="↕"
                label="Flip vertical"
                onClick={() => canvas && flipVertical(canvas)}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <ToolbarBtn
                icon="⊙"
                label="Centrar en canvas"
                onClick={() => canvas && centerOnCanvas(canvas)}
              />
              <ToolbarBtn
                icon="🗑"
                label="Eliminar"
                danger
                onClick={() => {
                  const s = useEditorStore.getState();
                  for (const id of [...s.selectedIds]) s.deleteElement(id);
                }}
              />
            </ToolbarGroup>
          </>
        )}

        {/* ── Forma ──────────────────────────────────────── */}
        {context === "shape" && (
          <>
            <ToolbarGroup>
              <ToolbarBtn
                icon="↔"
                label="Flip horizontal"
                onClick={() => canvas && flipHorizontal(canvas)}
              />
              <ToolbarBtn
                icon="↕"
                label="Flip vertical"
                onClick={() => canvas && flipVertical(canvas)}
              />
              <ToolbarBtn
                icon="⊙"
                label="Centrar"
                onClick={() => canvas && centerOnCanvas(canvas)}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <ToolbarBtn
                icon="🗑"
                label="Eliminar"
                danger
                onClick={() => {
                  const s = useEditorStore.getState();
                  for (const id of [...s.selectedIds]) s.deleteElement(id);
                }}
              />
            </ToolbarGroup>
          </>
        )}

        {/* ── Multi-select ───────────────────────────────── */}
        {context === "multi" && (
          <>
            <ToolbarGroup>
              <ToolbarBtn
                icon="◫"
                label="Alinear izquierda"
                onClick={() => {
                  if (!canvas) return;
                  const { alignObjects } = require("../engines/alignment-engine");
                  alignObjects(canvas, "left", "selection");
                }}
              />
              <ToolbarBtn
                icon="◨"
                label="Centrar horizontal"
                onClick={() => {
                  if (!canvas) return;
                  const { alignObjects } = require("../engines/alignment-engine");
                  alignObjects(canvas, "center-h", "selection");
                }}
              />
              <ToolbarBtn
                icon="◧"
                label="Alinear derecha"
                onClick={() => {
                  if (!canvas) return;
                  const { alignObjects } = require("../engines/alignment-engine");
                  alignObjects(canvas, "right", "selection");
                }}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <ToolbarBtn
                icon="🗑"
                label="Eliminar todo"
                danger
                onClick={() => {
                  const s = useEditorStore.getState();
                  for (const id of [...s.selectedIds]) s.deleteElement(id);
                }}
              />
            </ToolbarGroup>
          </>
        )}

        {/* Flecha apuntando al objeto */}
        <div className="absolute left-1/2 top-full -translate-x-1/2">
          <div className="h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-900/95" />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-white/10" />;
}

type ToolbarBtnProps = {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  bold?: boolean;
  italic?: boolean;
};

function ToolbarBtn({ icon, label, onClick, danger, bold, italic }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition ${
        danger
          ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
          : "text-zinc-400 hover:bg-white/8 hover:text-zinc-100"
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}
    >
      {icon}
    </button>
  );
}