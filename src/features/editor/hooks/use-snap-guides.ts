"use client";

import { useCallback, useRef, useState } from "react";
import type { Canvas, FabricObject } from "fabric";
import { computeSnapResult } from "../canvas/snap-engine";
import type { SnapGuide } from "../canvas/snap-engine";

const GUIDES_CLEAR_DELAY_MS = 120;

export type SnapGuidesState = {
  guides: SnapGuide[];
};

export function useSnapGuides(getCanvas: () => Canvas | null) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const applySnap = useCallback(
    (obj: FabricObject, rawLeft: number, rawTop: number) => {
      const canvas = getCanvas();
      if (!canvas) return { left: rawLeft, top: rawTop };

      const result = computeSnapResult(canvas, obj, rawLeft, rawTop);

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }

      activeRef.current = result.guides.length > 0;
      setGuides(result.guides);

      return { left: result.left, top: result.top };
    },
    [getCanvas],
  );

  const clearGuides = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setGuides([]);
      activeRef.current = false;
      clearTimerRef.current = null;
    }, GUIDES_CLEAR_DELAY_MS);
  }, []);

  const clearGuidesImmediate = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setGuides([]);
    activeRef.current = false;
  }, []);

  return {
    guides,
    applySnap,
    clearGuides,
    clearGuidesImmediate,
    hasActiveGuides: () => activeRef.current,
  };
}