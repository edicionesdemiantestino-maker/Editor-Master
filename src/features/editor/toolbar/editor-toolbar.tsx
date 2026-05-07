"use client";

import Link from "next/link";
import { useState } from "react";

import { ExportModal } from "@/features/editor/export/ui";

import {
  alignActiveTextObject,
  duplicateActiveObject,
} from "../canvas/fabric-toolbar-actions";
import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";
import { AddImageControl } from "./add-image-control";
import { EditorToolbarCloudSave } from "./editor-toolbar-cloud-save";
import { CreditsBadge } from "@/features/billing/credits/credits-badge";

type EditorToolbarProps = {
  fabricCanvasGetter: () => import("fabric").Canvas | null;
  projectId: string;
};

export function EditorToolbar({
  fabricCanvasGetter,
  projectId,
}: EditorToolbarProps) {
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        getCanvas={fabricCanvasGetter}
      />
      <Link
        href="/dashboard/projects"
        className="mr-1 text-sm text-zinc-400 underline-offset-2 hover:text-white hover:underline"
      >
        Proyectos
      </Link>
      <button
        type="button"
        className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
        onClick={() => {
          const s = useEditorStore.getState();
          s.addElement(createDefaultTextElement(s.present));
        }}
      >
        + Texto
      </button>
      <AddImageControl />
      <div className="mx-2 h-6 w-px bg-zinc-700" aria-hidden />
      <EditorToolbarCloudSave projectId={projectId} />
      <CreditsBadge />
      <div className="mx-2 h-6 w-px bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-40"
        disabled={!canUndo}
        onClick={() => useEditorStore.getState().undo()}
      >
        Deshacer
      </button>
      <button
        type="button"
        className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-40"
        disabled={!canRedo}
        onClick={() => useEditorStore.getState().redo()}
      >
        Rehacer
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-700" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Alinear
      </span>
      <button
        type="button"
        className="rounded-md border border-zinc-600 px-2 py-1.5 text-xs text-zinc-200"
        onClick={() => alignActiveTextObject(fabricCanvasGetter(), "left")}
      >
        Izq.
      </button>
      <button
        type="button"
        className="rounded-md border border-zinc-600 px-2 py-1.5 text-xs text-zinc-200"
        onClick={() => alignActiveTextObject(fabricCanvasGetter(), "center")}
      >
        Centro
      </button>
      <button
        type="button"
        className="rounded-md border border-zinc-600 px-2 py-1.5 text-xs text-zinc-200"
        onClick={() => alignActiveTextObject(fabricCanvasGetter(), "right")}
      >
        Der.
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200"
        onClick={() =>
          void duplicateActiveObject(fabricCanvasGetter()).catch(() => {
            window.alert("No se pudo duplicar la selección.");
          })
        }
      >
        Duplicar
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-sky-500/60 bg-sky-500/15 px-4 py-1.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/25"
        onClick={() => setExportOpen(true)}
      >
        Exportar
      </button>
    </div>
  );
}
