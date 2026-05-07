"use client";

import { useCallback, useState } from "react";
import type { Canvas } from "fabric";
import { FabricImage } from "fabric";

import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

import { findFabricObjectByElementId } from "../canvas/fabric-element-id";
import { useEditorStore } from "../store/editor-store";

import { useMagicEraseStore } from "./magic-erase-store";
import { runMagicEraseForSelectedImage } from "./run-magic-erase";
import { useMagicEraseRectCapture } from "./use-magic-erase-rect-capture";
import { BuyCreditsButton } from "@/features/billing/credits/buy-credits-button";

type MagicErasePanelProps = {
  getCanvas: () => Canvas | null;
};

export function MagicErasePanel({ getCanvas }: MagicErasePanelProps) {
  const mode = useMagicEraseStore((s) => s.mode);
  const prompt = useMagicEraseStore((s) => s.prompt);
  const setPrompt = useMagicEraseStore((s) => s.setPrompt);
  const startSelectRect = useMagicEraseStore((s) => s.startSelectRect);
  const stop = useMagicEraseStore((s) => s.stop);

  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedElement = useEditorStore((s) => {
    const id = s.selectedIds[0];
    return id
      ? s.present.canvas.elements.find((e) => e.id === id)
      : undefined;
  });

  const [busy, setBusy] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  const selectedIsImage =
    selectedIds.length === 1 && selectedElement?.type === "image";

  const onRect = useCallback(
    async (sceneRect: InpaintSceneRect) => {
      stop();
      const state = useEditorStore.getState();
      const id = state.selectedIds[0];
      if (!id) {
        window.alert("Seleccioná una imagen en el canvas.");
        return;
      }
      const model = state.present.canvas.elements.find((e) => e.id === id);
      if (!model || model.type !== "image") {
        window.alert("El borrador mágico solo aplica a imágenes.");
        return;
      }
      const canvas = getCanvas();
      if (!canvas) return;
      const obj = findFabricObjectByElementId(canvas, id);
      if (!(obj instanceof FabricImage)) {
        window.alert("No se encontró el objeto Fabric de la imagen.");
        return;
      }

      setBusy(true);
      setInsufficientCredits(false);
      try {
        const { dataUrl, width, height } = await runMagicEraseForSelectedImage({
          fabricImage: obj,
          model,
          sceneRect,
          prompt: useMagicEraseStore.getState().prompt.trim() || undefined,
        });
        useEditorStore.getState().updateElement(
          id,
          {
            src: dataUrl,
            naturalWidth: width,
            naturalHeight: height,
          },
          { recordHistory: true },
        );
      } catch (e) {
        console.error(e);
        if (e instanceof Error && e.message.toLowerCase().includes("créditos")) {
          setInsufficientCredits(true);
        }
        window.alert(
          e instanceof Error ? e.message : "Falló el inpainting remoto.",
        );
      } finally {
        setBusy(false);
      }
    },
    [getCanvas, stop],
  );

  useMagicEraseRectCapture({
    getCanvas,
    active: mode === "select_rect",
    onRect,
  });

  const canArm =
    selectedIsImage && !busy && mode === "off";

  return (
    <section className="border-b border-zinc-200 p-4 dark:border-zinc-700">
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Borrador mágico (IA)
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Replicate (SD Inpainting): dibujá un rectángulo sobre la imagen
        seleccionada. La máscara marca en blanco la zona a reconstruir.
      </p>
      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="text-zinc-600 dark:text-zinc-300">Prompt (opcional)</span>
        <textarea
          value={prompt}
          rows={2}
          disabled={busy}
          placeholder="p. ej. fondo limpio, sin objeto"
          className="resize-none rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "off" ? (
          <button
            type="button"
            disabled={!canArm}
            title={
              !selectedIsImage
                ? "Seleccioná una sola imagen en el canvas."
                : "Dibujá un rectángulo sobre la imagen."
            }
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-40"
            onClick={() => {
              if (!selectedIsImage) {
                window.alert("Seleccioná una imagen en el canvas.");
                return;
              }
              startSelectRect();
            }}
          >
            Seleccionar zona
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600"
            onClick={() => stop()}
          >
            Cancelar selección
          </button>
        )}
      </div>
      {mode === "select_rect" ? (
        <p className="mt-2 text-xs text-sky-700 dark:text-sky-300">
          Arrastrá un rectángulo sobre la imagen. Al soltar se envía a la API.
        </p>
      ) : null}
      {busy ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Procesando con Replicate…
        </p>
      ) : null}
      {insufficientCredits ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          Te quedaste sin créditos para inpaint.{" "}
          <span className="text-amber-200/80">Comprá más y reintentá.</span>
          <div className="mt-2">
            <BuyCreditsButton pack="medium" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
