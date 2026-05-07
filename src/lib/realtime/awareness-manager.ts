import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

// ── Tipos de presencia ────────────────────────────────────────
export type UserPresence = {
  userId: string;
  userName: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedIds: string[];
  viewport: { x: number; y: number; zoom: number } | null;
  lastSeen: number;
};

export type RemoteUser = UserPresence & {
  clientId: number;
};

// ── Colores para cursores remotos ─────────────────────────────
const CURSOR_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
] as const;

export function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]!;
}

// ── Awareness manager ─────────────────────────────────────────
export class AwarenessManager {
  private awareness: Awareness;
  private userId: string;
  private userName: string;
  private color: string;
  private listeners: Set<(users: RemoteUser[]) => void> = new Set();
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(doc: Y.Doc, userId: string, userName: string) {
    this.awareness = new Awareness(doc);
    this.userId = userId;
    this.userName = userName;
    this.color = getColorForUser(userId);

    // Estado inicial
    this.awareness.setLocalState({
      userId,
      userName,
      color: this.color,
      cursor: null,
      selectedIds: [],
      viewport: null,
      lastSeen: Date.now(),
    } satisfies UserPresence);

    // Escuchar cambios de otros
    this.awareness.on("change", () => {
      this.notifyListeners();
    });
  }

  // ── Actualizar cursor (throttled a 50ms) ──────────────────
  updateCursor(x: number, y: number): void {
    if (this.throttleTimer) return;
    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
      const current = this.awareness.getLocalState() as UserPresence | null;
      if (!current) return;
      this.awareness.setLocalState({
        ...current,
        cursor: { x, y },
        lastSeen: Date.now(),
      });
    }, 50);
  }

  // ── Actualizar selección ──────────────────────────────────
  updateSelection(selectedIds: string[]): void {
    const current = this.awareness.getLocalState() as UserPresence | null;
    if (!current) return;
    this.awareness.setLocalState({
      ...current,
      selectedIds,
      lastSeen: Date.now(),
    });
  }

  // ── Actualizar viewport ───────────────────────────────────
  updateViewport(x: number, y: number, zoom: number): void {
    const current = this.awareness.getLocalState() as UserPresence | null;
    if (!current) return;
    this.awareness.setLocalState({
      ...current,
      viewport: { x, y, zoom },
      lastSeen: Date.now(),
    });
  }

  // ── Obtener usuarios remotos ──────────────────────────────
  getRemoteUsers(): RemoteUser[] {
    const states = this.awareness.getStates();
    const result: RemoteUser[] = [];

    for (const [clientId, state] of states) {
      if (clientId === this.awareness.clientID) continue;
      if (!state || !state.userId) continue;

      const presence = state as UserPresence;
      // Ignorar usuarios inactivos por más de 30s
      if (Date.now() - (presence.lastSeen ?? 0) > 30_000) continue;

      result.push({ ...presence, clientId });
    }

    return result;
  }

  // ── Suscribirse a cambios de presencia ────────────────────
  subscribe(listener: (users: RemoteUser[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const users = this.getRemoteUsers();
    for (const listener of this.listeners) {
      listener(users);
    }
  }

  // ── Limpiar al desconectar ────────────────────────────────
  destroy(): void {
    if (this.throttleTimer) clearTimeout(this.throttleTimer);
    this.awareness.setLocalState(null);
    this.awareness.destroy();
    this.listeners.clear();
  }

  getAwareness(): Awareness {
    return this.awareness;
  }

  getMyColor(): string {
    return this.color;
  }
}