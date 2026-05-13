"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Canvas } from "fabric";

import { useZoomPan } from "./hooks/use-zoom-pan";
import { useWorkspacePreferences } from "./hooks/use-workspace-preferences";
import { FloatingToolbar } from "./shell/floating-toolbar";
import {
  FocusModeButton,
  FocusModeOverlay,
  useFocusMode,
  useFocusModeShortcut,
} from "./shell/focus-mode";
import type { EditorDocument } from "@/entities/editor/document-schema";
import { getProjectAction } from "@/app/actions/project-persistence";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useSnapGuides } from "./hooks/use-snap-guides";
import { SnapOverlay } from "./canvas/snap-overlay";
import { BleedOverlay, useBleedOverlayStore } from "./canvas/bleed-overlay";
import { WorkspaceBackground } from "./canvas/workspace-background";
import { RulersOverlay, useGuidesStore, RulersToggleButton } from "./canvas/rulers-overlay";
import { useEditorStore } from "./store/editor-store";
import { EditorCanvas } from "./canvas/editor-canvas";
import { useFontPreload } from "./fonts/use-font-preload";
import { EditorLeftSidebar } from "./shell/editor-left-sidebar";
import { EditorPersistenceProvider } from "./persistence/editor-persistence-context";
import { EditorToolbar } from "./toolbar/editor-toolbar";
import { ContextInspector } from "./shell/context-inspector";
import { CommandMenu } from "./shell/command-menu";
import { BottomBar } from "./shell/bottom-bar";
import { fitToScreen } from "./engines/zoom-pan-engine";
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [showRulers, setShowRulers] = useState(false);

  // ── Preferencias persistidas ──────────────────────────────
  const { persistSidebarState, persistRightPanel, getInitialPrefs } =
    useWorkspacePreferences();

  const initialPrefs = useRef(getInitialPrefs());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialPrefs.current.sidebarCollapsed ?? false,
  );
  const [rightCollapsed, setRightCollapsed] = useState(
    initialPrefs.current.rightPanelCollapsed ?? false,
  );

  useFontPreload();

  const getCanvas = () => fabricCanvasRef.current;

  useKeyboardShortcuts({ getCanvas });
  useFocusModeShortcut();

  const { active: focusMode } = useFocusMode();
  useZoomPan({ getCanvas, enabled: true });

  const { guides } = useSnapGuides(getCanvas);
  const guidesStore = useGuidesStore();

  const canvasWidth = useEditorStore((s) => s.present.canvas.width);
  const canvasHeight = useEditorStore((s) => s.present.canvas.height);
  const elementCount = useEditorStore((s) => s.present.canvas.elements.length);

  const {
    showBleed,
    showMargin,
    showCropMarks,
    bleedMm,
    marginMm,
  } = useBleedOverlayStore();

  // ── Cmd+K ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Auto fit-to-screen al cargar ──────────────────────────
  const hasFitted = useRef(false);
  useEffect(() => {
    if (hasFitted.current || loadPending) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setTimeout(() => {
      const c = fabricCanvasRef.current;
      if (c) fitToScreen(c);
    }, 200);
    hasFitted.current = true;
  }, [loadPending]);

  // ── Cargar proyecto ───────────────────────────────────────
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

  const handleSidebarToggle = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    persistSidebarState(next);
  };

  const handleRightToggle = () => {
    const next = !rightCollapsed;
    setRightCollapsed(next);
    persistRightPanel(next);
  };

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
      <CommandMenu
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        fabricCanvasGetter={getCanvas}
        onExport={() => {}}
      />

      <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
        {/* Banners */}
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

        {/* Toolbar */}
        <EditorToolbar
          projectId={projectId}
          fabricCanvasGetter={getCanvas}
          onOpenCommandMenu={() => setCommandOpen(true)}
        />

        {/* Main layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* Left sidebar */}
          <div
            className={`hidden shrink-0 overflow-hidden border-r border-white/5 transition-all duration-200 lg:block ${
              sidebarCollapsed || focusMode ? "w-12" : "w-[260px]"
            }`}
          >
            <EditorLeftSidebar
              projectId={projectId}
              collapsed={sidebarCollapsed || focusMode}
              onToggle={handleSidebarToggle}
            />
          </div>

          {/* Canvas workspace */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <WorkspaceBackground showGrid />

            {/* Rulers overlay */}
            {showRulers && (
              <RulersOverlay
                getCanvas={getCanvas}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            )}

            {/* Canvas area */}
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto"
              style={{ padding: showRulers ? "28px 8px 8px 28px" : "32px" }}
            >
              {/* Empty state */}
              {elementCount === 0 && !loadPending && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/3 text-3xl">
                      ✦
                    </div>
                    <p className="text-sm font-medium text-zinc-500">
                      Canvas vacío
                    </p>
                    <p className="text-xs text-zinc-700">
                      Usá{" "}
                      <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px]">
                        ⌘K
                      </kbd>{" "}
                      para insertar elementos
                    </p>
                  </div>
                </div>
              )}

              {/* Documento con sombra premium */}
              <div
                className="relative shrink-0"
                style={{
                  lineHeight: 0,
                  filter:
                    "drop-shadow(0 0 0 1px rgba(255,255,255,0.06)) drop-shadow(0 24px 64px rgba(0,0,0,0.7)) drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
                }}
              >
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

            {/* Bottom bar */}
            <BottomBar getCanvas={getCanvas} />
          </div>

          {/* Right inspector */}
          {!focusMode && !rightCollapsed && (
            <div className="hidden min-h-0 w-[300px] shrink-0 overflow-hidden border-l border-white/5 bg-zinc-950 lg:flex lg:flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Inspector
                </span>
                <div className="flex items-center gap-1.5">
                  <RulersToggleButton />
                  <button
                    type="button"
                    onClick={() => setShowRulers((v) => !v)}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition ${
                      showRulers
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                        : "border-white/8 bg-white/5 text-zinc-600 hover:text-zinc-300"
                    }`}
                    title="Mostrar reglas"
                  >
                    📐
                  </button>
                  <FocusModeButton />
                  <button
                    type="button"
                    onClick={handleRightToggle}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
                    title="Cerrar inspector"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ContextInspector getCanvas={getCanvas} />
              </div>
            </div>
          )}

          {/* Right panel collapsed button */}
          {!focusMode && rightCollapsed && (
            <button
              type="button"
              onClick={handleRightToggle}
              className="hidden w-8 shrink-0 items-center justify-center border-l border-white/5 bg-zinc-950 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 lg:flex"
              title="Abrir inspector"
            >
              ←
            </button>
          )}
        </div>
      </div>

      <FloatingToolbar getCanvas={getCanvas} />
      <FocusModeOverlay />
    </EditorPersistenceProvider>
  );
}