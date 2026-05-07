"use client";

import { useEffect, useRef, useState } from "react";
import type { RemoteUser } from "@/lib/realtime/awareness-manager";

type LiveCursorsProps = {
  remoteUsers: RemoteUser[];
  canvasOffsetX?: number;
  canvasOffsetY?: number;
};

type CursorPosition = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
};

const INTERPOLATION_FACTOR = 0.18;
const CURSOR_TIMEOUT_MS = 8_000;

function useSmoothCursors(
  remoteUsers: RemoteUser[],
): Map<number, CursorPosition> {
  const positionsRef = useRef<Map<number, CursorPosition>>(new Map());
  const [, forceUpdate] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Actualizar targets cuando cambian los usuarios
    for (const user of remoteUsers) {
      if (!user.cursor) continue;
      const existing = positionsRef.current.get(user.clientId);
      if (existing) {
        existing.targetX = user.cursor.x;
        existing.targetY = user.cursor.y;
      } else {
        positionsRef.current.set(user.clientId, {
          x: user.cursor.x,
          y: user.cursor.y,
          targetX: user.cursor.x,
          targetY: user.cursor.y,
        });
      }
    }

    // Limpiar cursores de usuarios que salieron
    const activeIds = new Set(remoteUsers.map((u) => u.clientId));
    for (const id of positionsRef.current.keys()) {
      if (!activeIds.has(id)) positionsRef.current.delete(id);
    }
  }, [remoteUsers]);

  useEffect(() => {
    const animate = () => {
      let needsUpdate = false;

      for (const pos of positionsRef.current.values()) {
        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          pos.x += dx * INTERPOLATION_FACTOR;
          pos.y += dy * INTERPOLATION_FACTOR;
          needsUpdate = true;
        }
      }

      if (needsUpdate) forceUpdate((n) => n + 1);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return positionsRef.current;
}

function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}
    >
      <path
        d="M2 2L8 16L10.5 10.5L16 8L2 2Z"
        fill={color}
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LiveCursors({
  remoteUsers,
  canvasOffsetX = 0,
  canvasOffsetY = 0,
}: LiveCursorsProps) {
  const smoothPositions = useSmoothCursors(remoteUsers);

  const visibleUsers = remoteUsers.filter((u) => {
    if (!u.cursor) return false;
    if (Date.now() - u.lastSeen > CURSOR_TIMEOUT_MS) return false;
    return true;
  });

  if (visibleUsers.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {visibleUsers.map((user) => {
        const pos = smoothPositions.get(user.clientId);
        if (!pos) return null;

        const screenX = pos.x - canvasOffsetX;
        const screenY = pos.y - canvasOffsetY;

        return (
          <div
            key={user.clientId}
            className="absolute"
            style={{
              left: screenX,
              top: screenY,
              transform: "translate(-2px, -2px)",
              willChange: "transform",
            }}
          >
            <CursorSVG color={user.color} />
            <div
              className="absolute left-4 top-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-md"
              style={{ backgroundColor: user.color }}
            >
              {user.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Indicador de usuarios online ──────────────────────────────
type OnlineUsersProps = {
  remoteUsers: RemoteUser[];
  localColor: string | null;
  localName: string | null;
};

export function OnlineUsers({
  remoteUsers,
  localColor,
  localName,
}: OnlineUsersProps) {
  const total = remoteUsers.length + 1;
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* Avatar local */}
      {localColor && localName && (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-zinc-900"
          style={{ backgroundColor: localColor }}
          title={`${localName} (vos)`}
        >
          {localName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Avatars remotos */}
      {remoteUsers.slice(0, 4).map((user) => (
        <div
          key={user.clientId}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-zinc-900"
          style={{ backgroundColor: user.color }}
          title={user.userName}
        >
          {user.userName.charAt(0).toUpperCase()}
        </div>
      ))}

      {remoteUsers.length > 4 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300 ring-2 ring-zinc-900">
          +{remoteUsers.length - 4}
        </div>
      )}

      <span className="text-xs text-zinc-500">
        {total} editando
      </span>
    </div>
  );
}