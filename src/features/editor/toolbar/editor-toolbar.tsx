"use client";

import Link from "next/link";
import { useState } from "react";

import { ExportModal } from "@/features/editor/export/ui";

import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";
import { AddImageControl } from "./add-image-control";
import { EditorToolbarCloudSave } from "./editor-toolbar-cloud-save";

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
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        getCanvas={fabricCanvasGetter}
      />
      <Link
        href="/"
        className="mr-1 text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Inicio
      </Link>
      <button
        type="button"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        onClick={() => {
          const s = useEditorStore.getState();
          s.addElement(createDefaultTextElement(s.present));
        }}
      >
        + Texto
      </button>
      <AddImageControl />
      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <EditorToolbarCloudSave projectId={projectId} />
      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-600"
        disabled={!canUndo}
        onClick={() => useEditorStore.getState().undo()}
      >
        Deshacer
      </button>
      <button
        type="button"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-600"
        disabled={!canRedo}
        onClick={() => useEditorStore.getState().redo()}
      >
        Rehacer
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-sky-600 bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60"
        onClick={() => setExportOpen(true)}
      >
        Exportar
      </button>
    </div>
  );
}
