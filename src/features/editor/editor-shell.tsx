"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Canvas } from "fabric";

import type { EditorDocument } from "@/entities/editor/document-schema";
import { getProjectAction } from "@/app/actions/project-persistence";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { EditorCanvas } from "./canvas/editor-canvas";
import { useFontPreload } from "./fonts/use-font-preload";
import { MagicErasePanel } from "./magic-erase/magic-erase-panel";
import { LayersPanel } from "./layers/layers-panel";
import { TextInspectorPanel } from "./text/text-inspector-panel";
import { EditorPersistenceProvider } from "./persistence/editor-persistence-context";
import { EditorToolbar } from "./toolbar/editor-toolbar";
import {
  loadEditorDocument,
  resetEditorForProject,
} from "./store/editor-store";

type EditorShellProps = {
  projectId: string;
  /** Documento ya hidratado en el servidor (evita refetch si la ruta pasó por `getProjectById`). */
  initialDocument?: EditorDocument;
};

export function EditorShell({ projectId, initialDocument }: EditorShellProps) {
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPending, setLoadPending] = useState(projectId !== "demo");
  useFontPreload();

  useEffect(() => {
    if (projectId === "demo") {
      resetEditorForProject("demo");
      startTransition(() => {
        setLoadError(null);
        setLoadPending(false);
      });
      return;
    }

    resetEditorForProject(projectId);
    startTransition(() => {
      setLoadError(null);
    });

    if (initialDocument) {
      loadEditorDocument(initialDocument);
      startTransition(() => {
        setLoadPending(false);
      });
      return;
    }

    startTransition(() => {
      setLoadPending(true);
    });

    if (!isSupabaseConfigured()) {
      startTransition(() => {
        setLoadError(
          "Supabase no está configurado: no se puede cargar este proyecto.",
        );
        setLoadPending(false);
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const r = await getProjectAction(projectId);
        if (cancelled) return;
        if (!r.ok) {
          setLoadError(r.message);
          return;
        }
        loadEditorDocument(r.document);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Error al cargar el proyecto.",
          );
        }
      } finally {
        if (!cancelled) setLoadPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, initialDocument]);

  const persistenceReady = !loadPending && !loadError;

  return (
    <EditorPersistenceProvider
      projectId={projectId}
      persistenceReady={persistenceReady}
      getFabricSnapshot={() => {
        const c = fabricCanvasRef.current;
        if (!c) return null;
        const raw = c.toJSON();
        return raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw
          : null;
      }}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-100 dark:bg-zinc-950">
        {loadPending ? (
          <div className="border-b border-zinc-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-zinc-700 dark:bg-amber-950/40 dark:text-amber-100">
            Cargando proyecto…
          </div>
        ) : null}
        {loadError ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-zinc-700 dark:bg-red-950/30 dark:text-red-100">
            <span>{loadError}</span>
            <Link href="/login" className="font-medium underline">
              Ir a ingresar
            </Link>
            <Link href="/" className="font-medium underline">
              Inicio
            </Link>
          </div>
        ) : null}
        <EditorToolbar
          projectId={projectId}
          fabricCanvasGetter={() => fabricCanvasRef.current}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
            <EditorCanvas
              onCanvasReady={(c) => {
                fabricCanvasRef.current = c;
              }}
            />
          </div>
          <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
            <MagicErasePanel getCanvas={() => fabricCanvasRef.current} />
            <TextInspectorPanel />
            <LayersPanel />
          </aside>
        </div>
      </div>
    </EditorPersistenceProvider>
  );
}
