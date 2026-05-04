"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";

import {
  useEditorAutosave,
  type EditorAutosaveState,
} from "./use-editor-autosave";

export type EditorPersistenceActions = {
  isCloudPersistenceActive: boolean;
  requestManualSave: () => Promise<{ ok: boolean; message?: string }>;
};

const EditorPersistenceActionsContext =
  createContext<EditorPersistenceActions | null>(null);

const EditorPersistenceStatusContext =
  createContext<EditorAutosaveState | null>(null);

type EditorPersistenceProviderProps = {
  children: ReactNode;
  projectId: string;
  persistenceReady: boolean;
  /** `canvas.toJSON()` del canvas existente (ref en el shell). */
  getFabricSnapshot?: () => unknown | null;
};

export function EditorPersistenceProvider({
  children,
  projectId,
  persistenceReady,
  getFabricSnapshot,
}: EditorPersistenceProviderProps) {
  const isRemote = projectId !== "demo";
  const isCloudPersistenceActive =
    isRemote && isSupabaseConfigured() && persistenceReady;

  const [autosaveState, setAutosaveState] = useState<EditorAutosaveState>({
    saveStatus: "idle",
    saveErrorMessage: null,
    lastSavedAt: null,
  });

  const onStateChange = useCallback((next: EditorAutosaveState) => {
    setAutosaveState(next);
  }, []);

  const { flushManual } = useEditorAutosave({
    projectId,
    persistenceReady: isCloudPersistenceActive,
    onStateChange,
    getFabricSnapshot,
  });

  const requestManualSave = useCallback(async () => {
    if (!isCloudPersistenceActive) {
      return { ok: false, message: "Guardado en la nube no disponible." };
    }
    return flushManual();
  }, [flushManual, isCloudPersistenceActive]);

  const actionsValue = useMemo<EditorPersistenceActions>(
    () => ({
      isCloudPersistenceActive,
      requestManualSave,
    }),
    [isCloudPersistenceActive, requestManualSave],
  );

  return (
    <EditorPersistenceActionsContext.Provider value={actionsValue}>
      <EditorPersistenceStatusContext.Provider value={autosaveState}>
        {children}
      </EditorPersistenceStatusContext.Provider>
    </EditorPersistenceActionsContext.Provider>
  );
}

export function useEditorPersistenceActions(): EditorPersistenceActions {
  const ctx = useContext(EditorPersistenceActionsContext);
  if (!ctx) {
    throw new Error(
      "useEditorPersistenceActions debe usarse dentro de EditorPersistenceProvider",
    );
  }
  return ctx;
}

export function useEditorPersistenceStatus(): EditorAutosaveState {
  const ctx = useContext(EditorPersistenceStatusContext);
  if (!ctx) {
    throw new Error(
      "useEditorPersistenceStatus debe usarse dentro de EditorPersistenceProvider",
    );
  }
  return ctx;
}
