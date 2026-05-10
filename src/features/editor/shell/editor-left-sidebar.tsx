"use client";

import { useState } from "react";
import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";
import { AddImageControl } from "../toolbar/add-image-control";
import { BrandKitPanel } from "../brand/brand-kit-panel";
import { LayersPanel } from "../layers/layers-panel";
import { MagicTextControl } from "./magic-text-control";
import { TemplatesSidebarPanel } from "./templates-sidebar-panel";
import { TextInspectorPanel } from "../text/text-inspector-panel";
import { useViewportOptions } from "../hooks/use-responsive-preview";

const TABS = ["Capas", "Texto", "Imágenes", "Marca", "Plantillas"] as const;
type TabKey = (typeof TABS)[number];

const TAB_ICONS: Record<TabKey, string> = {
  Capas: "◫",
  Texto: "T",
  Imágenes: "▣",
  Marca: "◈",
  Plantillas: "⊞",
};

type EditorLeftSidebarProps = {
  projectId: string;
  collapsed: boolean;
  onToggle: () => void;
};

export function EditorLeftSidebar({
  projectId,
  collapsed,
  onToggle,
}: EditorLeftSidebarProps) {
  const [tab, setTab] = useState<TabKey>("Capas");
  const { options, setViewport } = useViewportOptions();

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-white/5 bg-zinc-950 py-2 gap-1">
        {/* Expand button */}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300"
          title="Expandir sidebar"
        >
          →
        </button>
        <div className="my-1 h-px w-6 bg-white/5" />
        {/* Icon tabs */}
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              onToggle();
              setTab(t);
            }}
            title={t}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300"
          >
            {TAB_ICONS[t]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-white/5 bg-zinc-950 text-zinc-100">
      {/* Header con collapse */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Herramientas
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 transition hover:bg-white/5 hover:text-zinc-400"
          title="Colapsar sidebar"
        >
          ←
        </button>
      </div>

      {/* Viewport switcher */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-white/5 px-2 py-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setViewport(opt.id)}
            title={`${opt.label} — ${opt.width}px`}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[10px] font-medium transition ${
              opt.active
                ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30"
                : "text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
            }`}
          >
            <span>{opt.icon}</span>
            <span className="hidden xl:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-0.5 border-b border-white/5 p-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              tab === t
                ? "bg-white/10 text-white"
                : "text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
            }`}
          >
            <span className="text-[11px]">{TAB_ICONS[t]}</span>
            <span className="hidden xl:inline">{t}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "Capas" && <LayersPanel />}

        {tab === "Texto" && (
          <div className="flex flex-col">
            <TextInspectorPanel />
            <div className="border-t border-white/5 p-3">
              <MagicTextControl />
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-white/8 bg-white/5 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/15 hover:bg-white/8 hover:text-zinc-100"
                onClick={() => {
                  const s = useEditorStore.getState();
                  s.addElement(createDefaultTextElement(s.present));
                }}
              >
                + Bloque de texto
              </button>
            </div>
          </div>
        )}

        {tab === "Imágenes" && (
          <div className="p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Agregar imagen
            </p>
            <AddImageControl />
          </div>
        )}

        {tab === "Marca" && (
          <div className="min-h-[120px]">
            <BrandKitPanel embedded />
          </div>
        )}

        {tab === "Plantillas" && (
          <div className="p-3">
            <TemplatesSidebarPanel projectId={projectId} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/5 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-700">Vista</span>
          <span className="text-[10px] font-medium text-zinc-500">
            {options.find((o) => o.active)?.label} —{" "}
            {options.find((o) => o.active)?.width}px
          </span>
        </div>
      </div>
    </div>
  );
}