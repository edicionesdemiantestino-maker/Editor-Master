"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  loadWorkspacePreferences,
  saveWorkspacePreferences,
  type WorkspacePreferences,
} from "../shell/workspace-preferences";
import { useBleedOverlayStore } from "../canvas/bleed-overlay";
import { useGuidesStore } from "../canvas/rulers-overlay";

// ── Hook principal ────────────────────────────────────────────
export function useWorkspacePreferences() {
  const bleedStore = useBleedOverlayStore();
  const guidesStore = useGuidesStore();
  const loadedRef = useRef(false);

  // ── Cargar preferencias al montar ─────────────────────────
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const prefs = loadWorkspacePreferences();

    // Aplicar bleed
    if (prefs.showBleed !== undefined) {
      bleedStore.setShowBleed(prefs.showBleed);
    }
    if (prefs.showMargin !== undefined) {
      bleedStore.setShowMargin(prefs.showMargin);
    }
    if (prefs.bleedMm !== undefined) {
      bleedStore.setBleedMm(prefs.bleedMm);
    }
    if (prefs.marginMm !== undefined) {
      bleedStore.setMarginMm(prefs.marginMm);
    }
    // Rulers
    if (prefs.showRulers === false) {
      if (guidesStore.visible) guidesStore.toggleVisible();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistir cambios automáticamente ────────────────────
  useEffect(() => {
    saveWorkspacePreferences({
      showBleed: bleedStore.showBleed,
      showMargin: bleedStore.showMargin,
      bleedMm: bleedStore.bleedMm,
      marginMm: bleedStore.marginMm,
    });
  }, [
    bleedStore.showBleed,
    bleedStore.showMargin,
    bleedStore.bleedMm,
    bleedStore.marginMm,
  ]);

  useEffect(() => {
    saveWorkspacePreferences({
      showRulers: guidesStore.visible,
    });
  }, [guidesStore.visible]);

  // ── Helpers manuales ──────────────────────────────────────
  const persistSidebarState = useCallback(
    (collapsed: boolean) => {
      saveWorkspacePreferences({ sidebarCollapsed: collapsed });
    },
    [],
  );

  const persistRightPanel = useCallback(
    (collapsed: boolean) => {
      saveWorkspacePreferences({ rightPanelCollapsed: collapsed });
    },
    [],
  );

  const persistActiveTab = useCallback((tab: string) => {
    saveWorkspacePreferences({ activeLeftTab: tab });
  }, []);

  const persistZoom = useCallback((zoom: number) => {
    saveWorkspacePreferences({ zoom });
  }, []);

  const getInitialPrefs = useCallback(
    (): Partial<WorkspacePreferences> => loadWorkspacePreferences(),
    [],
  );

  return {
    persistSidebarState,
    persistRightPanel,
    persistActiveTab,
    persistZoom,
    getInitialPrefs,
  };
}