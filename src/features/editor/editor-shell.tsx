"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Canvas } from "fabric";
import { ImageEffectsPanel } from "./canvas/image-effects-panel";
import type { EditorDocument } from "@/entities/editor/document-schema";
import { getProjectAction } from "@/app/actions/project-persistence";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useSnapGuides } from "./hooks/use-snap-guides";
import { SnapOverlay } from "./canvas/snap-overlay";
import { BleedOverlay, useBleedOverlayStore } from "./canvas/bleed-overlay";
import { useEditorStore } from "./store/editor-store";
import { EditorCanvas } from "./canvas/editor-canvas";
import { useFontPreload } from "./fonts/use-font-preload";
import { MagicErasePanel } from "./magic-erase/magic-erase-panel";
import { EditorLeftSidebar } from "./shell/editor-left-sidebar";
import { EditorPersistenceProvider } from "./persistence/editor-persistence-context";
import { EditorToolbar } from "./toolbar/editor-toolbar";
import {
  loadEditorDocument,
  resetEditorForProject,
} from "./store/editor-store";

const MM_TO_PX = 3.7795275591;

type EditorShellProps = {
  projectId: string;
  initialDocument?: EditorDocument;
  canEditProject?: boolean;
};

export function EditorShell({
  projectId,
  initialDocument,
  canEditProject = true,
}: EditorShellProps) {
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPending, setLoadPending] = useState(projectId !== "demo");
  useFontPreload();

  const getCanvas = () => fabricCanvasRef.current;
  useKeyboardShortcuts({ getCanvas });
  const { guides } = useSnapGuides(getCanvas);
  const canvasWidth = useEditorStore((s) => s.present.canvas.width);
  const canvasHeight = useEditorStore((s) => s.present.canvas.height);

  const {
    showBleed,
    showMargin,
    showCropMarks,
    bleedMm,
    marginMm,
  } = useBleedOverlayStore();

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
    startTransition(() => setLoadError(null));

    if (initialDocument) {
      loadEditorDocument(initialDocument);
      startTransition(() => setLoadPending(false));
      return;
    }

    startTransition(() => setLoadPending(true));

    if (!isSupabaseConfigured()) {
      startTransition(() => {
        setLoadError("Supabase no está configurado.");
        setLoadPending(false);
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const r = await getProjectAction(projectId);
        if (cancelled) return;
        if (!r.ok) { setLoadError(r.message); return; }
        loadEditorDocument(r.document);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Error al cargar.");
        }
      } finally {
        if (!cancelled) setLoadPending(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, initialDocument]);

  const persistenceReady = !loadPending && !loadError;

  return (
    <EditorPersistenceProvider
      projectId={projectId}
      persistenceReady={persistenceReady}
      allowCloudPersist={projectId === "demo" ? true : canEditProject}
      getFabricSnapshot={() => {
        const c = fabricCanvasRef.current;
        if (!c) return null;
        const raw = c.toJSON();
        return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
      }}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
        {loadPending && (
          <div className="border-b border-zinc-800 bg-amber-950/50 px-4 py-2 text-sm text-amber-100">
            Cargando proyecto…
          </div>
        )}
        {projectId !== "demo" && !canEditProject && !loadPending && !loadError && (
          <div className="border-b border-zinc-800 bg-zinc-800/80 px-4 py-2 text-xs text-zinc-300">
            Este proyecto está compartido como solo lectura.
          </div>
        )}
        {loadError && (
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-red-950/40 px-4 py-2 text-sm text-red-100">
            <span>{loadError}</span>
            <Link href="/login" className="font-medium underline">Ir a ingresar</Link>
            <Link href="/" className="font-medium underline">Inicio</Link>
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="hidden min-h-0 w-[260px] shrink-0 overflow-hidden border-r border-zinc-800 lg:block">
            <EditorLeftSidebar projectId={projectId} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <EditorToolbar
              projectId={projectId}
              fabricCanvasGetter={() => fabricCanvasRef.current}
            />
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-zinc-950 p-4">
              <div className="relative" style={{ lineHeight: 0 }}>
                <EditorCanvas
                  onCanvasReady={(c) => { fabricCanvasRef.current = c; }}
                />
                <SnapOverlay
                  guides={guides}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                />
                <BleedOverlay
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  bleedPx={Math.round(bleedMm * MM_TO_PX)}
                  marginPx={Math.round(marginMm * MM_TO_PX)}
                  showBleed={showBleed}
                  showMargin={showMargin}
                  showCropMarks={showCropMarks}
                />
              </div>
            </div>
          </div>

          <aside className="min-h-0 w-full shrink-0 overflow-y-auto border-t border-zinc-800 bg-zinc-900 lg:w-[320px] lg:border-l lg:border-t-0">
  <div className="border-b border-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
    Herramientas e inspector
  </div>
  <MagicErasePanel getCanvas={() => fabricCanvasRef.current} />
  <div className="border-t border-zinc-800">
    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      Efectos de imagen
    </div>
    <ImageEffectsPanel />
  </div>
</aside>
        </div>
      </div>
    </EditorPersistenceProvider>
  );
}