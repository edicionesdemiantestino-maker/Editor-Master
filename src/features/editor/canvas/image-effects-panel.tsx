"use client";

import { useMemo } from "react";
import { useEditorStore } from "../store/editor-store";
import { isImageElement } from "@/entities/editor/element-guards";
import type { ImageElement } from "@/entities/editor/document-schema";
import type { ImageEffectsState } from "@/entities/editor/image-effects";

type EffectSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onChange: (v: number) => void;
};

function EffectSlider({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  onChange,
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
              onClick={() => onChange(defaultValue)}
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
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500"
      />
    </div>
  );
}

const BLEND_PRESETS = [
  {
    id: "original",
    label: "Original",
    effects: {
      blur: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      grayscale: 0,
      sepia: 0,
      pixelate: 1,
      hueRotation: 0,
      noise: 0,
      opacity: 1,
    },
  },
  {
    id: "vivid",
    label: "Vívido",
    effects: {
      blur: 0,
      brightness: 15,
      contrast: 20,
      saturation: 40,
      grayscale: 0,
      sepia: 0,
      pixelate: 1,
      hueRotation: 0,
      noise: 0,
      opacity: 1,
    },
  },
  {
    id: "matte",
    label: "Mate",
    effects: {
      blur: 0,
      brightness: 10,
      contrast: -15,
      saturation: -20,
      grayscale: 0,
      sepia: 0,
      pixelate: 1,
      hueRotation: 0,
      noise: 15,
      opacity: 1,
    },
  },
  {
    id: "noir",
    label: "Noir",
    effects: {
      blur: 0,
      brightness: -10,
      contrast: 30,
      saturation: -100,
      grayscale: 100,
      sepia: 0,
      pixelate: 1,
      hueRotation: 0,
      noise: 8,
      opacity: 1,
    },
  },
  {
    id: "sepia",
    label: "Sépia",
    effects: {
      blur: 0,
      brightness: 5,
      contrast: 0,
      saturation: -30,
      grayscale: 0,
      sepia: 80,
      pixelate: 1,
      hueRotation: 0,
      noise: 5,
      opacity: 1,
    },
  },
  {
    id: "dreamy",
    label: "Dreamy",
    effects: {
      blur: 3,
      brightness: 15,
      contrast: -10,
      saturation: 20,
      grayscale: 0,
      sepia: 10,
      pixelate: 1,
      hueRotation: 0,
      noise: 0,
      opacity: 0.92,
    },
  },
  {
    id: "pixel",
    label: "Pixel",
    effects: {
      blur: 0,
      brightness: 0,
      contrast: 10,
      saturation: 0,
      grayscale: 0,
      sepia: 0,
      pixelate: 12,
      hueRotation: 0,
      noise: 0,
      opacity: 1,
    },
  },
  {
    id: "cold",
    label: "Frío",
    effects: {
      blur: 0,
      brightness: 0,
      contrast: 5,
      saturation: -10,
      grayscale: 0,
      sepia: 0,
      pixelate: 1,
      hueRotation: 200,
      noise: 0,
      opacity: 1,
    },
  },
] as const;

export function ImageEffectsPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  const selectedImage = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const el = present.canvas.elements.find((e) => e.id === selectedIds[0]);
    return el && isImageElement(el) ? el : null;
  }, [present.canvas.elements, selectedIds]);

  if (!selectedImage) {
    return (
      <div className="p-4">
        <p className="text-xs text-zinc-600">
          Seleccioná una imagen para aplicar efectos.
        </p>
      </div>
    );
  }

  const effects = selectedImage.effects as ImageEffectsState & {
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    grayscale?: number;
    sepia?: number;
    pixelate?: number;
    hueRotation?: number;
    noise?: number;
  };

  const commitEffect = (patch: Partial<ImageEffectsState>) => {
    useEditorStore.getState().updateElement(
      selectedImage.id,
      {
        effects: { ...effects, ...patch },
      } as Partial<ImageElement>,
      { recordHistory: false },
    );
  };

  const commitEffectFinal = (patch: Partial<ImageEffectsState>) => {
    useEditorStore.getState().updateElement(
      selectedImage.id,
      {
        effects: { ...effects, ...patch },
      } as Partial<ImageElement>,
      { recordHistory: true },
    );
  };

  const applyPreset = (preset: (typeof BLEND_PRESETS)[number]) => {
    useEditorStore.getState().updateElement(
      selectedImage.id,
      { effects: { ...effects, ...preset.effects } } as Partial<ImageElement>,
      { recordHistory: true },
    );
  };

  const resetAll = () => {
    useEditorStore.getState().updateElement(
      selectedImage.id,
      {
        effects: {
          ...effects,
          blur: 0,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          grayscale: 0,
          sepia: 0,
          pixelate: 1,
          hueRotation: 0,
          noise: 0,
          opacity: 1,
        },
      } as Partial<ImageElement>,
      { recordHistory: true },
    );
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
          {BLEND_PRESETS.map((preset) => (
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
        <EffectSlider
          label="Brillo"
          value={effects.brightness ?? 0}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => commitEffect({ brightness: v } as any)}
        />
        <EffectSlider
          label="Contraste"
          value={effects.contrast ?? 0}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => commitEffect({ contrast: v } as any)}
        />
        <EffectSlider
          label="Saturación"
          value={effects.saturation ?? 0}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => commitEffect({ saturation: v } as any)}
        />
        <EffectSlider
          label="Tono (Hue)"
          value={effects.hueRotation ?? 0}
          min={0}
          max={360}
          defaultValue={0}
          onChange={(v) => commitEffect({ hueRotation: v } as any)}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Filtros
        </p>
        <EffectSlider
          label="Escala de grises"
          value={effects.grayscale ?? 0}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => commitEffect({ grayscale: v } as any)}
        />
        <EffectSlider
          label="Sépia"
          value={effects.sepia ?? 0}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => commitEffect({ sepia: v } as any)}
        />
      </div>

      {/* Efectos especiales */}
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Efectos especiales
        </p>
        <EffectSlider
          label="Desenfoque"
          value={effects.blur ?? 0}
          min={0}
          max={40}
          step={0.5}
          defaultValue={0}
          onChange={(v) => commitEffect({ blur: v } as any)}
        />
        <EffectSlider
          label="Pixelado"
          value={effects.pixelate ?? 1}
          min={1}
          max={50}
          defaultValue={1}
          onChange={(v) => commitEffect({ pixelate: v } as any)}
        />
        <EffectSlider
          label="Ruido / Grain"
          value={effects.noise ?? 0}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => commitEffect({ noise: v } as any)}
        />
      </div>

      {/* Opacidad */}
      <div className="p-3">
        <EffectSlider
          label="Opacidad"
          value={(selectedImage.opacity ?? 1) * 100}
          min={0}
          max={100}
          defaultValue={100}
          onChange={(v) =>
            commitEffectFinal({ opacity: v / 100 } as any)
          }
        />
      </div>
    </div>
  );
}