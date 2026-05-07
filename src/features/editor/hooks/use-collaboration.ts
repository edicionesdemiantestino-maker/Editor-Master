"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";

import { useEditorStore } from "../store/editor-store";
import { useCollaborationStore } from "@/lib/realtime/collaboration-store";
import { AwarenessManager } from "@/lib/realtime/awareness-manager";
import {
  createRealtimeProvider,
  type RealtimeProvider,
} from "@/lib/realtime/realtime-provider";
import {
  createEditorYDoc,
  syncElementsToYjs,
  syncElementsFromYjs,
  type EditorYDoc,
  type YCanvasElement,
} from "@/lib/realtime/yjs-document";

type UseCollaborationOptions = {
  projectId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
};

const SYNC_DEBOUNCE_MS = 150;
const AWARENESS_THROTTLE_MS = 80;

export function useCollaboration({
  projectId,
  userId,
  userName,
  enabled = true,
}: UseCollaborationOptions) {
  const ydocRef = useRef<EditorYDoc | null>(null);
  const providerRef = useRef<RealtimeProvider | null>(null);
  const awarenessRef = useRef<AwarenessManager | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const lastLocalSnapshotRef = useRef<string>("");

  const collab = useCollaborationStore();

  // ── Inicializar ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !projectId || !userId) return;

    // Crear Y.Doc
    const ydoc = createEditorYDoc(projectId);
    ydocRef.current = ydoc;

    // Crear AwarenessManager
    const awareness = new AwarenessManager(ydoc.doc, userId, userName);
    awarenessRef.current = awareness;

    // Registrar usuario local
    collab.setLocalUser(userId, userName, awareness.getMyColor());
    collab.setProjectId(projectId);

    // Suscribirse a cambios de presencia
    const unsubAwareness = awareness.subscribe((users) => {
      collab.setRemoteUsers(users);
    });

    // Escuchar cambios remotos en Y.Map
    const onYjsChange = (
  _changes: Y.YMapEvent<YCanvasElement>,
  transaction: Y.Transaction,
) => {
      // Ignorar cambios originados localmente
      if (transaction.local) return;
      if (isApplyingRemoteRef.current) return;

      isApplyingRemoteRef.current = true;
      try {
        const store = useEditorStore.getState();
        const currentOrder = store.present.canvas.elements.map((e) => e.id);
        const merged = syncElementsFromYjs(ydoc.elements, currentOrder);

        const nextDoc = {
          ...store.present,
          canvas: { ...store.present.canvas, elements: merged },
        };

        store.replacePresent(nextDoc, "transient");
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };

    ydoc.elements.observe(onYjsChange);

    // Crear provider WebSocket
    const provider = createRealtimeProvider({
      serverUrl: process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL ?? "",
      projectId,
      doc: ydoc.doc,
      awarenessManager: awareness,
      onStatusChange: (status) => {
        collab.setStatus(status);
      },
      onSynced: () => {
        collab.setSynced(true);
      },
      onError: (err) => {
        collab.setError(err.message);
      },
    });

    providerRef.current = provider;

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      unsubAwareness();
      ydoc.elements.unobserve(onYjsChange);
      awareness.destroy();
      provider?.destroy();
      ydocRef.current = null;
      awarenessRef.current = null;
      providerRef.current = null;
      collab.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, userId, enabled]);

  // ── Sync local → Yjs (debounced) ─────────────────────────
  useEffect(() => {
    if (!enabled) return;

    return useEditorStore.subscribe(
      (s) => s.present.canvas.elements,
      (elements) => {
        if (isApplyingRemoteRef.current) return;
        const ydoc = ydocRef.current;
        if (!ydoc) return;

        // Evitar sincronizar si no cambió nada
        const snapshot = JSON.stringify(elements.map((e) => e.id));
        if (snapshot === lastLocalSnapshotRef.current) return;
        lastLocalSnapshotRef.current = snapshot;

        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          if (isApplyingRemoteRef.current) return;
          syncElementsToYjs(elements, ydoc.elements, userId, ydoc.doc);
        }, SYNC_DEBOUNCE_MS);
      },
    );
  }, [userId, enabled]);

  // ── Sync selección → awareness ────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    return useEditorStore.subscribe(
      (s) => s.selectedIds,
      (selectedIds) => {
        awarenessRef.current?.updateSelection(selectedIds);
      },
    );
  }, [enabled]);

  // ── Actualizar cursor ─────────────────────────────────────
  const updateCursor = useCallback((x: number, y: number) => {
    awarenessRef.current?.updateCursor(x, y);
  }, []);

  // ── Actualizar viewport ───────────────────────────────────
  const updateViewport = useCallback(
    (x: number, y: number, zoom: number) => {
      awarenessRef.current?.updateViewport(x, y, zoom);
    },
    [],
  );

  return {
    updateCursor,
    updateViewport,
    isConnected: collab.isOnline,
    isSynced: collab.isSynced,
    status: collab.status,
    remoteUsers: collab.remoteUsers,
    localColor: collab.localColor,
  };
}