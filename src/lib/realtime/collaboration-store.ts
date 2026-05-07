import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { RemoteUser } from "./awareness-manager";
import type { ProviderStatus } from "./realtime-provider";

// ── Estado de colaboración ────────────────────────────────────
export type CollaborationState = {
  // Conexión
  status: ProviderStatus;
  isOnline: boolean;
  isSynced: boolean;
  lastSyncedAt: number | null;
  error: string | null;

  // Presencia
  remoteUsers: RemoteUser[];
  localUserId: string | null;
  localUserName: string | null;
  localColor: string | null;

  // Proyecto actual
  projectId: string | null;

  // Acciones
  setStatus: (status: ProviderStatus) => void;
  setSynced: (synced: boolean) => void;
  setError: (error: string | null) => void;
  setRemoteUsers: (users: RemoteUser[]) => void;
  setLocalUser: (userId: string, userName: string, color: string) => void;
  setProjectId: (projectId: string) => void;
  reset: () => void;
};

const initialState = {
  status: "disconnected" as ProviderStatus,
  isOnline: false,
  isSynced: false,
  lastSyncedAt: null,
  error: null,
  remoteUsers: [],
  localUserId: null,
  localUserName: null,
  localColor: null,
  projectId: null,
};

export const useCollaborationStore = create<CollaborationState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setStatus: (status) =>
      set({
        status,
        isOnline: status === "connected",
        error: status === "error" ? "Error de conexión" : null,
      }),

    setSynced: (isSynced) =>
      set({
        isSynced,
        lastSyncedAt: isSynced ? Date.now() : null,
      }),

    setError: (error) => set({ error }),

    setRemoteUsers: (remoteUsers) => set({ remoteUsers }),

    setLocalUser: (userId, userName, color) =>
      set({
        localUserId: userId,
        localUserName: userName,
        localColor: color,
      }),

    setProjectId: (projectId) => set({ projectId }),

    reset: () => set(initialState),
  })),
);

// ── Selectores ────────────────────────────────────────────────
export const selectRemoteUsers = (s: CollaborationState) =>
  s.remoteUsers;

export const selectIsCollaborating = (s: CollaborationState) =>
  s.remoteUsers.length > 0;

export const selectConnectionStatus = (s: CollaborationState) =>
  s.status;

export const selectOnlineCount = (s: CollaborationState) =>
  s.remoteUsers.length + (s.localUserId ? 1 : 0);