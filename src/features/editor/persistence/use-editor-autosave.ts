"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { saveProjectAction } from "@/app/actions/project-persistence";

import { subscribeFabricSceneDirty } from "./fabric-scene-dirty-bus";
import {
  fingerprintPersistablePayload,
  mergePresentWithFabricSnapshot,
} from "./serialize-document";
import { useEditorStore } from "../store/editor-store";
import { fnv1a32 } from "@/lib/hash/fnv1a";

export type EditorSaveStatus = "idle" | "saving" | "saved" | "error";

export type EditorAutosaveState = {
  saveStatus: EditorSaveStatus;
  saveErrorMessage: string | null;
  lastSavedAt: number | null;
};

const DEFAULT_DEBOUNCE_MS = 1500;
const SAVED_UI_RESET_MS = 1600;
const RETRY_DELAY_MS = 500;

type UseEditorAutosaveArgs = {
  projectId: string;
  persistenceReady: boolean;
  debounceMs?: number;
  onStateChange: (next: EditorAutosaveState) => void;
  /** Snapshot del canvas existente (`canvas.toJSON()`), sin crear otro canvas. */
  getFabricSnapshot?: () => unknown | null;
};

/**
 * Autosave con debounce sobre el documento canónico (`present`).
 * Cadena serial de escrituras; omite red si el fingerprint no cambió.
 */
export function useEditorAutosave({
  projectId,
  persistenceReady,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onStateChange,
  getFabricSnapshot,
}: UseEditorAutosaveArgs) {
  const onStateChangeRef = useRef(onStateChange);
  const projectIdRef = useRef(projectId);

  useLayoutEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useLayoutEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  const getFabricSnapshotRef = useRef(getFabricSnapshot);
  useLayoutEffect(() => {
    getFabricSnapshotRef.current = getFabricSnapshot;
  }, [getFabricSnapshot]);

  const lastSavedFingerprintRef = useRef<string | null>(null);
  const lastSuccessfulSavedAtRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef(Promise.resolve());

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearSavedUiTimer = useCallback(() => {
    if (savedUiTimerRef.current) {
      clearTimeout(savedUiTimerRef.current);
      savedUiTimerRef.current = null;
    }
  }, []);

  const scheduleSavedToIdle = useCallback(() => {
    clearSavedUiTimer();
    savedUiTimerRef.current = setTimeout(() => {
      savedUiTimerRef.current = null;
      onStateChangeRef.current({
        saveStatus: "idle",
        saveErrorMessage: null,
        lastSavedAt: lastSuccessfulSavedAtRef.current,
      });
    }, SAVED_UI_RESET_MS);
  }, [clearSavedUiTimer]);

  const runPersist = useCallback(async (): Promise<{
    ok: boolean;
    message?: string;
  }> => {
    const present = useEditorStore.getState().present;
    const fabricSnap = getFabricSnapshotRef.current?.() ?? null;
    const payload = mergePresentWithFabricSnapshot(present, fabricSnap);
    const fpJson = fingerprintPersistablePayload(present, fabricSnap);
    const fp = fnv1a32(fpJson);
    if (fp === lastSavedFingerprintRef.current) {
      return { ok: true };
    }

    onStateChangeRef.current({
      saveStatus: "saving",
      saveErrorMessage: null,
      lastSavedAt: lastSuccessfulSavedAtRef.current,
    });
    clearSavedUiTimer();

    let result = await saveProjectAction(projectIdRef.current, payload);
    if (!result.ok) {
      // Retry 1 vez (sin paralelismo; mantiene la cola serial).
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      result = await saveProjectAction(projectIdRef.current, payload);
    }
    if (result.ok) {
      lastSavedFingerprintRef.current = fp;
      const at = Date.now();
      lastSuccessfulSavedAtRef.current = at;
      onStateChangeRef.current({
        saveStatus: "saved",
        saveErrorMessage: null,
        lastSavedAt: at,
      });
      scheduleSavedToIdle();
      return { ok: true };
    }

    lastSavedFingerprintRef.current = null;
    onStateChangeRef.current({
      saveStatus: "error",
      saveErrorMessage: result.message,
      lastSavedAt: lastSuccessfulSavedAtRef.current,
    });
    return { ok: false, message: result.message };
  }, [clearSavedUiTimer, scheduleSavedToIdle]);

  const enqueuePersist = useCallback(() => {
    const next = saveChainRef.current.then(runPersist, runPersist);
    saveChainRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, [runPersist]);

  const flushManual = useCallback(async () => {
    clearDebounce();
    return enqueuePersist();
  }, [clearDebounce, enqueuePersist]);

  useEffect(() => {
    if (!persistenceReady) {
      clearDebounce();
      clearSavedUiTimer();
      lastSavedFingerprintRef.current = null;
      lastSuccessfulSavedAtRef.current = null;
      onStateChangeRef.current({
        saveStatus: "idle",
        saveErrorMessage: null,
        lastSavedAt: null,
      });
      return;
    }

    const fabricSnapBoot = getFabricSnapshotRef.current?.() ?? null;
    lastSavedFingerprintRef.current = fnv1a32(
      fingerprintPersistablePayload(useEditorStore.getState().present, fabricSnapBoot),
    );

    const schedule = () => {
      clearDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void enqueuePersist();
      }, debounceMs);
    };

    const unsub = useEditorStore.subscribe(
      (s) => s.present,
      () => {
        schedule();
      },
    );

    const unsubFabric = subscribeFabricSceneDirty(() => {
      schedule();
    });

    return () => {
      unsub();
      unsubFabric();
      clearDebounce();
      clearSavedUiTimer();
    };
  }, [clearDebounce, clearSavedUiTimer, debounceMs, enqueuePersist, persistenceReady]);

  return { flushManual };
}
