import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { AwarenessManager } from "./awareness-manager";

export type ProviderStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type ProviderOptions = {
  serverUrl: string;
  projectId: string;
  doc: Y.Doc;
  awarenessManager: AwarenessManager;
  authToken?: string;
  onStatusChange?: (status: ProviderStatus) => void;
  onSynced?: () => void;
  onError?: (error: Error) => void;
};

const RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

export class RealtimeProvider {
  private provider: WebsocketProvider | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = RECONNECT_DELAY_MS;
  private destroyed = false;
  private status: ProviderStatus = "connecting";
  private options: ProviderOptions;

  constructor(options: ProviderOptions) {
    this.options = options;
    this.connect();
  }

  private connect(): void {
    if (this.destroyed) return;

    const { serverUrl, projectId, doc, awarenessManager, authToken } =
      this.options;

    const roomName = `editor-maestro:${projectId}`;

    const params: Record<string, string> = {};
    if (authToken) {
      params.token = authToken;
    }

    this.provider = new WebsocketProvider(serverUrl, roomName, doc, {
      awareness: awarenessManager.getAwareness(),
      params,
      connect: true,
      resyncInterval: 10_000,
    });

    this.provider.on("status", ({ status }: { status: string }) => {
      if (this.destroyed) return;

      if (status === "connected") {
        this.setStatus("connected");
        this.reconnectDelay = RECONNECT_DELAY_MS;
        this.startHeartbeat();
      } else if (status === "disconnected") {
        this.setStatus("disconnected");
        this.stopHeartbeat();
        this.scheduleReconnect();
      }
    });

    this.provider.on("sync", (synced: boolean) => {
      if (synced && !this.destroyed) {
        this.options.onSynced?.();
      }
    });

    this.provider.on("connection-error", (event: Event) => {
      if (this.destroyed) return;
      this.setStatus("error");
      this.options.onError?.(new Error("WebSocket connection error"));
      this.stopHeartbeat();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.destroyed) return;
      this.provider?.destroy();
      this.provider = null;
      this.connect();
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 1.5,
        MAX_RECONNECT_DELAY_MS,
      );
    }, this.reconnectDelay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.provider?.wsconnected) {
        // Yjs WebsocketProvider maneja el ping internamente
        // Solo verificamos que sigue conectado
        if (!this.provider.wsconnected) {
          this.setStatus("disconnected");
          this.stopHeartbeat();
          this.scheduleReconnect();
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(status: ProviderStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  getStatus(): ProviderStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.provider?.wsconnected ?? false;
  }

  // ── Forzar resync ─────────────────────────────────────────
  resync(): void {
  if (this.provider?.wsconnected) {
    (this.provider as any).resync?.();
  }
}

  // ── Desconectar limpiamente ───────────────────────────────
  destroy(): void {
    this.destroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.provider?.destroy();
    this.provider = null;
  }
}

// ── Factory con fallback a modo offline ───────────────────────
export function createRealtimeProvider(
  options: ProviderOptions,
): RealtimeProvider | null {
  const wsUrl =
    process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL ??
    process.env.NEXT_PUBLIC_REALTIME_URL;

  if (!wsUrl) {
    console.warn(
      "[realtime] NEXT_PUBLIC_YJS_WEBSOCKET_URL no configurada — modo offline",
    );
    return null;
  }

  return new RealtimeProvider({ ...options, serverUrl: wsUrl });
}