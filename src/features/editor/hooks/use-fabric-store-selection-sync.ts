"use client";

import type { MutableRefObject } from "react";
import { useEffect } from "react";
import type { Canvas } from "fabric";

import { applyStoreSelectionToFabricCanvas } from "../canvas/fabric-selection";
import { useEditorStore } from "../store/editor-store";

export function useFabricStoreSelectionSync(
  getCanvas: () => Canvas | null,
  suppressSelectionEventsRef: MutableRefObject<boolean>,
) {
  useEffect(() => {
    return useEditorStore.subscribe(
      (s) => s.selectedIds,
      (ids) => {
        applyStoreSelectionToFabricCanvas(
          getCanvas(),
          ids,
          suppressSelectionEventsRef,
        );
      },
      {
        equalityFn: (a, b) =>
          a.length === b.length && a.every((id, i) => id === b[i]),
        fireImmediately: true,
      },
    );
  }, [getCanvas, suppressSelectionEventsRef]);
}
