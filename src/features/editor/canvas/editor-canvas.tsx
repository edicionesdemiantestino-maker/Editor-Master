"use client";

import { useRef } from "react";
import type { Canvas } from "fabric";

import { useFabricCanvasEvents } from "../hooks/use-fabric-canvas-events";
import { useFabricCanvasInstance } from "../hooks/use-fabric-canvas-instance";
import { useFabricDocumentReconcile } from "../hooks/use-fabric-document-reconcile";
import { useFabricStoreSelectionSync } from "../hooks/use-fabric-store-selection-sync";

type EditorCanvasProps = {
  className?: string;
  onCanvasReady?: (canvas: Canvas) => void;
};

export function EditorCanvas({ className, onCanvasReady }: EditorCanvasProps) {
  const reconcileGuardRef = useRef<boolean>(false);
  const suppressSelectionEventsRef = useRef<boolean>(false);

  const { canvasElRef, getCanvas } = useFabricCanvasInstance(
    reconcileGuardRef,
    onCanvasReady,
  );

  useFabricDocumentReconcile(getCanvas, reconcileGuardRef);
  useFabricStoreSelectionSync(getCanvas, suppressSelectionEventsRef);
  useFabricCanvasEvents({
    getCanvas,
    reconcileGuardRef,
    suppressSelectionEventsRef,
  });

  return (
    <div className={className} style={{ lineHeight: 0 }}>
      <canvas
        ref={canvasElRef}
        className="rounded-md border border-zinc-200 shadow-sm dark:border-zinc-700"
      />
    </div>
  );
}
