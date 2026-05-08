"use client";

import { useMemo, useCallback } from "react";
import { useEditorStore } from "../store/editor-store";
import { isImageElement } from "@/entities/editor/element-guards";
import type { ImageElement } from "@/entities/editor/document-schema";
import type { ImageEffectsState } from "@/entities/editor/image-effects";
import { createDefaultImageEffects } from "@/entities/editor/image-effects";

type EffectKey = keyof Omit<ImageEffectsState, "version">;

type EffectSliderProps = {
  label: string;
  effectKey: EffectKey;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onCommit: (key: EffectKey, value: number) => void;
};

function EffectSlider({
  label,
  effectKey,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  onCommit,
}: EffectSliderProps) {
  const isModified = Math.abs(value - defaultValue) > 0.01;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">{label}</span>
        <div className="flex items-center gap-1.5">
          {isModified && (
            <button
              type="button"
              onClick={() => onCommit(effectKey, defaultValue)}
              className="text-[9px] text-zinc-600 hover:text-indigo-400"
              title="Resetear"
            >
              reset
            </button>
          )}
          <span className="w-8 text-right font-mono text-[10px] text-zinc-400">
            {Math.round(value * 10) / 10}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onCommit(effectKey, parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500"
      />
    </div>
  );
}

const PRESETS: {
  id: string;
  label: string;
  effects: Partial<Omit<ImageEffectsState, "version">>;
}[] = [
  { id: "original", label: "Original", effects: {} },
  {
    id: "vivid",
    label: "Vívido",
    effects: { brightness: 15, contrast: 20, saturation: 40 },
  },
  {
    id: "matte",
    label: "Mate",
    effects: { brightness: 10, contrast: -15, saturation: -20, noise: 15 },
  },
  {
    id: "noir",
    label: "Noir",
    effects: { brightness: -10, contrast: 30, grayscale: 100, noise: 8 },
  },
  {
    id: "sepia",
    label: "Sépia",
    effects: { brightness: 5, saturation: -30, sepia: 80, noise: 5 },
  },
  {
    id: "dreamy",
    label: "Dreamy",
    effects: { blur: 3, brightness: 15, contrast: -10, saturation: 20, sepia: 10 },
  },
  {
    id: "pixel",
    label: "Pixel",
    effects: { pixelate: 12, contrast: 10 },
  },
  {
    id: "cold",
    label: "Frío",
    effects: { contrast: 5, saturation: -10, hueRotation: 200 },
  },
];

export function ImageEffectsPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  const selectedImage = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const el = present.canvas.elements.find((e) => e.id === selectedIds[0]);
    return el && isImageElement(el) ? el : null;
  }, [present.canvas.elements, selectedIds]);

  const commitEffect = useCallback(
    (key: EffectKey, value: number, recordHistory = true) => {
      if (!selectedImage) return;
      const current = selectedImage.effects as ImageEffectsState;
      useEditorStore.getState().updateElement(
        selectedImage.id,
        {
          effects: {
            ...current,
            [key]: value,
          },
        } as Partial<ImageElement>,
        { recordHistory },
      );
    },
    [selectedImage],
  );

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      if (!selectedImage) return;
      const defaults = createDefaultImageEffects();
      useEditorStore.getState().updateElement(
        selectedImage.id,
        {
          effects: {
            ...defaults,
            ...preset.effects,
          },
        } as Partial<ImageElement>,
        { recordHistory: true },
      );
    },
    [selectedImage],
  );

  const resetAll = useCallback(() => {
    if (!selectedImage) return;
    useEditorStore.getState().updateElement(
      selectedImage.id,
      { effects: createDefaultImageEffects() } as Partial<ImageElement>,
      { recordHistory: true },
    );
  }, [selectedImage]);

  if (!selectedImage) {
    return (
      <div className="p-4">
        <p className="text-xs text-zinc-600">
          Seleccioná una imagen para aplicar efectos.
        </p>
      </div>
    );
  }

  const effects = selectedImage.effects as ImageEffectsState;
  const safeEffects = {
    brightness: effects.brightness ?? 0,
    contrast: effects.contrast ?? 0,
    saturation: effects.saturation ?? 0,
    blur: effects.blur ?? 0,
    grayscale: effects.grayscale ?? 0,
    sepia: effects.sepia ?? 0,
    pixelate: effects.pixelate ?? 1,
    hueRotation: effects.hueRotation ?? 0,
    noise: effects.noise ?? 0,
  };

  return (
    <div className="flex flex-col gap-0 divide-y divide-zinc-800/60">
      {/* Presets */}
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            Presets
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="text-[9px] text-zinc-600 hover:text-indigo-400"
          >
            Resetear todo
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-lg border border-zinc-800 bg-zinc-800/40 py-2 text-[10px] text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Luz y color */}
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Luz y color
        </p>
        <EffectSlider label="Brillo" effectKey="brightness"
          value={safeEffects.brightness} min={-100} max={100} defaultValue={0}
          onCommit={commitEffect} />
        <EffectSlider label="Contraste" effectKey="contrast"
          value={safeEffects.contrast} min={-100} max={100} defaultValue={0}
          onCommit={commitEffect} />
        <EffectSlider label="Saturación" effectKey="saturation"
          value={safeEffects.saturation} min={-100} max={100} defaultValue={0}
          onCommit={commitEffect} />
        <EffectSlider label="Tono (Hue)" effectKey="hueRotation"
          value={safeEffects.hueRotation} min={0} max={360} defaultValue={0}
          onCommit={commitEffect} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Filtros
        </p>
        <EffectSlider label="Escala de grises" effectKey="grayscale"
          value={safeEffects.grayscale} min={0} max={100} defaultValue={0}
          onCommit={commitEffect} />
        <EffectSlider label="Sépia" effectKey="sepia"
          value={safeEffects.sepia} min={0} max={100} defaultValue={0}
          onCommit={commitEffect} />
      </div>

      {/* Efectos especiales */}
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Efectos especiales
        </p>
        <EffectSlider label="Desenfoque" effectKey="blur"
          value={safeEffects.blur} min={0} max={40} step={0.5} defaultValue={0}
          onCommit={commitEffect} />
        <EffectSlider label="Pixelado" effectKey="pixelate"
          value={safeEffects.pixelate} min={1} max={50} defaultValue={1}
          onCommit={commitEffect} />
        <EffectSlider label="Ruido / Grain" effectKey="noise"
          value={safeEffects.noise} min={0} max={100} defaultValue={0}
          onCommit={commitEffect} />
      </div>
    </div>
  );
}