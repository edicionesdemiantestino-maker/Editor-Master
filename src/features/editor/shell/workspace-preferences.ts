// ── Workspace Preferences — persistencia en localStorage ──────
// Guarda preferencias del editor entre sesiones.

export type WorkspacePreferences = {
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  showRulers: boolean;
  showGrid: boolean;
  showBleed: boolean;
  showMargin: boolean;
  bleedMm: number;
  marginMm: number;
  focusMode: boolean;
  zoom: number;
  activeLeftTab: string;
  compactMode: boolean;
};

const STORAGE_KEY = "em_workspace_prefs_v1";

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  sidebarCollapsed: false,
  rightPanelCollapsed: false,
  showRulers: false,
  showGrid: true,
  showBleed: false,
  showMargin: false,
  bleedMm: 3,
  marginMm: 10,
  focusMode: false,
  zoom: 1,
  activeLeftTab: "Capas",
  compactMode: false,
};

export function loadWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveWorkspacePreferences(
  prefs: Partial<WorkspacePreferences>,
): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadWorkspacePreferences();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...prefs }),
    );
  } catch {}
}

export function resetWorkspacePreferences(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}