"use client";

import { useState } from "react";
import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";
import { AddImageControl } from "../toolbar/add-image-control";
import { BrandKitPanel } from "../brand/brand-kit-panel";
import { LayersPanel } from "../layers/layers-panel";

import { MagicTextControl } from "./magic-text-control";
import { TemplatesSidebarPanel } from "./templates-sidebar-panel";

const TABS = ["Capas", "Texto", "Imágenes", "Marca", "Plantillas"] as const;
type TabKey = (typeof TABS)[number];

export function EditorLeftSidebar({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<TabKey>("Capas");

  return (
    <div className="flex h-full min-h-0 flex-col border-zinc-800 bg-zinc-900 text-zinc-100">
      <div className="flex shrink-0 flex-wrap gap-0.5 border-b border-zinc-800 p-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              tab === t
                ? "bg-white/10 text-white shadow-inner"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "Capas" ? <LayersPanel /> : null}

        {tab === "Texto" ? (
          <div className="space-y-3 p-3">
            <MagicTextControl />
            <p className="text-xs text-zinc-500">Insertá texto editable en el lienzo.</p>
            <button
              type="button"
              className="w-full rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-900 hover:bg-white"
              onClick={() => {
                const s = useEditorStore.getState();
                s.addElement(createDefaultTextElement(s.present));
              }}
            >
              + Bloque de texto
            </button>
          </div>
        ) : null}

        {tab === "Imágenes" ? (
          <div className="p-3">
            <AddImageControl />
          </div>
        ) : null}

        {tab === "Marca" ? (
          <div className="min-h-[120px]">
            <BrandKitPanel embedded />
          </div>
        ) : null}

        {tab === "Plantillas" ? (
          <div className="p-3">
            <TemplatesSidebarPanel projectId={projectId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
