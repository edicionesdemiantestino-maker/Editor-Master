"use client";

import dynamic from "next/dynamic";

import type { EditorDocument } from "@/entities/editor/document-schema";

const EditorShell = dynamic(
  () =>
    import("@/features/editor/editor-shell").then((m) => ({
      default: m.EditorShell,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-zinc-500">Cargando editor…</p>
    ),
  },
);

export function EditorPageClient({
  projectId,
  initialDocument,
  canEditProject = true,
}: {
  projectId: string;
  /** Si el servidor ya validó sesión + fila, evitamos un segundo fetch en el cliente. */
  initialDocument?: EditorDocument;
  /** Viewer: sólo lectura (sin autosave ni guardado manual). */
  canEditProject?: boolean;
}) {
  return (
    <EditorShell
      projectId={projectId}
      initialDocument={initialDocument}
      canEditProject={canEditProject}
    />
  );
}
