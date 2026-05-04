"use client";

import type { MutableRefObject } from "react";
import { useEffect } from "react";
import type { Canvas, FabricObject, ModifiedEvent, TPointerEvent } from "fabric";
import { FabricImage, IText } from "fabric";

import { expandFabricEventTargets, mergeFabricObjectIntoElement } from "../canvas/fabric-to-model";
import { getFabricElementId } from "../canvas/fabric-element-id";
import type { PresentUpdateMode } from "../store/editor-store";
import { useEditorStore } from "../store/editor-store";
import { updateElementInDocument } from "../store/document-mutations";
import { bumpFabricSceneDirty } from "../persistence/fabric-scene-dirty-bus";
import { scheduleFabricRender } from "../canvas/fabric-render-schedule";
import { pickUniformImageScale } from "../canvas/image-transform";

type FabricCanvasEventsOptions = {
  getCanvas: () => Canvas | null;
  reconcileGuardRef: MutableRefObject<boolean>;
  suppressSelectionEventsRef: MutableRefObject<boolean>;
};

function resolvePresentModeForFabricObject(
  target: FabricObject,
): PresentUpdateMode {
  if (target instanceof IText && target.isEditing) {
    return "transient";
  }
  return "commit";
}

export function useFabricCanvasEvents({
  getCanvas,
  reconcileGuardRef,
  suppressSelectionEventsRef,
}: FabricCanvasEventsOptions) {
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const persistTargets = (target: FabricObject | undefined) => {
      if (!target || reconcileGuardRef.current) return;
      const state = useEditorStore.getState();
      const targets = expandFabricEventTargets(target);
      let doc = state.present;
      let transientOk = true;
      let updates = 0;

      for (const t of targets) {
        const id = getFabricElementId(t);
        if (!id) continue;
        const elModel = doc.canvas.elements.find((e) => e.id === id);
        if (!elModel) continue;
        if (resolvePresentModeForFabricObject(t) !== "transient") {
          transientOk = false;
        }
        doc = updateElementInDocument(
          doc,
          id,
          mergeFabricObjectIntoElement(elModel, t),
        );
        updates += 1;
      }

      if (updates === 0) return;

      const mode: PresentUpdateMode = transientOk ? "transient" : "commit";

      state.markFabricMutationStart();
      state.replacePresent(doc, mode);
    };

    const onObjectModified = (opt: ModifiedEvent<TPointerEvent>) => {
      persistTargets(opt.target);
      bumpFabricSceneDirty();
    };

    const onObjectScaling = (opt: { target?: FabricObject }) => {
      if (reconcileGuardRef.current) return;
      const t = opt.target;
      if (!(t instanceof FabricImage)) return;
      const id = getFabricElementId(t);
      if (!id) return;
      const state = useEditorStore.getState();
      const el = state.present.canvas.elements.find((e) => e.id === id);
      if (!el || el.type !== "image" || el.lockAspectRatio === false) return;
      const sx = t.scaleX ?? 1;
      const sy = t.scaleY ?? 1;
      if (Math.abs(sx - sy) < 1e-5) return;
      const u = pickUniformImageScale(sx, sy);
      t.set({ scaleX: u, scaleY: u });
      t.setCoords();
      scheduleFabricRender(canvas);
    };

    const onObjectMoving = () => {
      if (reconcileGuardRef.current) return;
      scheduleFabricRender(canvas);
    };

    const onTextChanged = (opt: { target?: FabricObject }) => {
      const t = opt.target;
      if (!(t instanceof IText)) return;
      persistTargets(t);
      bumpFabricSceneDirty();
    };

    const onTextEditingEntered = (opt: { target?: FabricObject }) => {
      if (!(opt.target instanceof IText)) return;
      useEditorStore.getState().pushHistoryAnchor();
    };

    const onSelection = (selected: FabricObject[]) => {
      if (suppressSelectionEventsRef.current) return;
      const ids = selected
        .map((o) => getFabricElementId(o))
        .filter((x): x is string => Boolean(x));
      useEditorStore.getState().select(ids);
    };

    const onSelectionCreated = (e: { selected?: FabricObject[] }) =>
      onSelection(e.selected ?? []);
    const onSelectionUpdated = (e: { selected?: FabricObject[] }) =>
      onSelection(e.selected ?? []);

    const onObjectAdded = () => {
      bumpFabricSceneDirty();
    };

    const onObjectRemoved = () => {
      bumpFabricSceneDirty();
    };

    canvas.on("object:modified", onObjectModified);
    canvas.on("object:added", onObjectAdded);
    canvas.on("object:removed", onObjectRemoved);
    canvas.on("object:scaling", onObjectScaling);
    canvas.on("text:changed", onTextChanged);
    canvas.on("text:editing:entered", onTextEditingEntered);
    canvas.on("selection:created", onSelectionCreated);
    canvas.on("selection:updated", onSelectionUpdated);

    const onSelectionCleared = () => {
      if (suppressSelectionEventsRef.current) return;
      useEditorStore.getState().clearSelection();
    };

    canvas.on("selection:cleared", onSelectionCleared);
    canvas.on("object:moving", onObjectMoving);

    return () => {
      canvas.off("object:modified", onObjectModified);
      canvas.off("object:added", onObjectAdded);
      canvas.off("object:removed", onObjectRemoved);
      canvas.off("object:scaling", onObjectScaling);
      canvas.off("text:changed", onTextChanged);
      canvas.off("text:editing:entered", onTextEditingEntered);
      canvas.off("selection:created", onSelectionCreated);
      canvas.off("selection:updated", onSelectionUpdated);
      canvas.off("selection:cleared", onSelectionCleared);
      canvas.off("object:moving", onObjectMoving);
    };
  }, [getCanvas, reconcileGuardRef, suppressSelectionEventsRef]);
}
