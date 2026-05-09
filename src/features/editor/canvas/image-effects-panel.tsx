"use client";

import { useMemo, useCallback, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { isImageElement } from "@/entities/editor/element-guards";
import type { ImageElement, BlendMode, ImageShadow } from "@/entities/editor/document-schema";
import type { ImageEffectsState } from "@/entities/editor/image-effects";
import {
  createDefaultImageEffects,
  IMAGE_PRESETS,
} from "@/entities/editor/image-effects";

type EffectKey = keyof Omit<ImageEffectsState, "version">;

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft Light" },
  { value: "hard-light", label: "Hard Light" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "luminosity", label: "Luminosity" },
];

const PRESET_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "mood", label: "Mood" },
  { id: "color", label: "Color" },
  { id: "style", label: "Estilo" },
  { id: "vintage", label: "Vintage" },
] as const;

function EffectSlider({
  label,
  effectKey,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  onCommit,
}: {
  label: string;
  effectKey: EffectKey;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onCommit: (key: EffectKey, value: number) => void;
}) {
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

function ShadowSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">{label}</span>
        <span className="font-mono text-[10px] text-zinc-400">
          {Math.round(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-violet-500"
      />
    </div>
  );
}

export function ImageEffectsPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const [presetCategory, setPresetCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"presets" | "adjust" | "blend" | "shadow">("presets");

  const selectedImage = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const el = present.canvas.elements.find((e) => e.id === selectedIds[0]);
    return el && isImageElement(el) ? el : null;
  }, [present.canvas.elements, selectedIds]);

  const commitEffect = useCallback(
    (key: EffectKey, value: number) => {
      if (!selectedImage) return;
      const current = selectedImage.effects as ImageEffectsState;
      useEditorStore.getState().updateElement(
        selectedImage.id,
        { effects: { ...current, [key]: value } } as Partial<ImageElement>,
        { recordHistory: true },
      );
    },
    [selectedImage],
  );

  const commitBlendMode = useCallback(
    (blendMode: BlendMode) => {
      if (!selectedImage) return;
      useEditorStore.getState().updateElement(
        selectedImage.id,
        { blendMode } as Partial<ImageElement>,
        { recordHistory: true },
      );
    },
    [selectedImage],
  );

  const commitShadow = useCallback(
    (patch: Partial<ImageShadow>) => {
      if (!selectedImage) return;
      const current: ImageShadow = selectedImage.shadow ?? {
        enabled: false,
        color: "#000000",
        blur: 10,
        offsetX: 5,
        offsetY: 5,
        opacity: 0.5,
      };
      useEditorStore.getState().updateElement(
        selectedImage.id,
        { shadow: { ...current, ...patch } } as Partial<ImageElement>,
        { recordHistory: true },
      );
    },
    [selectedImage],
  );

  const applyPreset = useCallback(
    (preset: (typeof IMAGE_PRESETS)[number]) => {
      if (!selectedImage) return;
      const defaults = createDefaultImageEffects();
      useEditorStore.getState().updateElement(
        selectedImage.id,
        { effects: { ...defaults, ...preset.effects } } as Partial<ImageElement>,
        { recordHistory: true },
      );
    },
    [selectedImage],
  );

  const resetAll = useCallback(() => {
    if (!selectedImage) return;
    useEditorStore.getState().updateElement(
      selectedImage.id,
      {
        effects: createDefaultImageEffects(),
        blendMode: "normal",
        shadow: undefined,
      } as Partial<ImageElement>,
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
    brightness: effects?.brightness ?? 0,
    contrast: effects?.contrast ?? 0,
    saturation: effects?.saturation ?? 0,
    blur: effects?.blur ?? 0,
    grayscale: effects?.grayscale ?? 0,
    sepia: effects?.sepia ?? 0,
    pixelate: effects?.pixelate ?? 1,
    hueRotation: effects?.hueRotation ?? 0,
    noise: effects?.noise ?? 0,
  };

  const shadow = selectedImage.shadow ?? {
    enabled: false,
    color: "#000000",
    blur: 10,
    offsetX: 5,
    offsetY: 5,
    opacity: 0.5,
  };

  const currentBlend = selectedImage.blendMode ?? "normal";

  const filteredPresets =
    presetCategory === "all"
      ? IMAGE_PRESETS
      : IMAGE_PRESETS.filter((p) => p.category === presetCategory);

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(
          [
            { id: "presets", label: "Presets" },
            { id: "adjust", label: "Ajustar" },
            { id: "blend", label: "Blend" },
            { id: "shadow", label: "Sombra" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${
              activeTab === tab.id
                ? "border-b-2 border-indigo-500 text-indigo-300"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reset global */}
      <div className="flex justify-end px-3 pt-2">
        <button
          type="button"
          onClick={resetAll}
          className="text-[9px] text-zinc-600 hover:text-indigo-400"
        >
          Resetear todo
        </button>
      </div>

      {/* ── Tab: Presets ──────────────────────────────────── */}
      {activeTab === "presets" && (
        <div className="p-3">
          {/* Categorías */}
          <div className="mb-2 flex gap-1 overflow-x-auto scrollbar-none">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPresetCategory(cat.id)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition ${
                  presetCategory === cat.id
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-zinc-800 bg-zinc-800/40 py-2.5 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Ajustar ──────────────────────────────────── */}
      {activeTab === "adjust" && (
        <div className="flex flex-col divide-y divide-zinc-800/60">
          <div className="flex flex-col gap-3 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Luz y color
            </p>
            <EffectSlider label="Brillo" effectKey="brightness"
              value={safeEffects.brightness} min={-100} max={100}
              defaultValue={0} onCommit={commitEffect} />
            <EffectSlider label="Contraste" effectKey="contrast"
              value={safeEffects.contrast} min={-100} max={100}
              defaultValue={0} onCommit={commitEffect} />
            <EffectSlider label="Saturación" effectKey="saturation"
              value={safeEffects.saturation} min={-100} max={100}
              defaultValue={0} onCommit={commitEffect} />
            <EffectSlider label="Tono" effectKey="hueRotation"
              value={safeEffects.hueRotation} min={0} max={360}
              defaultValue={0} onCommit={commitEffect} />
          </div>

          <div className="flex flex-col gap-3 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Filtros
            </p>
            <EffectSlider label="Escala de grises" effectKey="grayscale"
              value={safeEffects.grayscale} min={0} max={100}
              defaultValue={0} onCommit={commitEffect} />
            <EffectSlider label="Sépia" effectKey="sepia"
              value={safeEffects.sepia} min={0} max={100}
              defaultValue={0} onCommit={commitEffect} />
          </div>

          <div className="flex flex-col gap-3 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Efectos
            </p>
            <EffectSlider label="Desenfoque" effectKey="blur"
              value={safeEffects.blur} min={0} max={40} step={0.5}
              defaultValue={0} onCommit={commitEffect} />
            <EffectSlider label="Pixelado" effectKey="pixelate"
              value={safeEffects.pixelate} min={1} max={50}
              defaultValue={1} onCommit={commitEffect} />
            <EffectSlider label="Grain" effectKey="noise"
              value={safeEffects.noise} min={0} max={100}
              defaultValue={0} onCommit={commitEffect} />
          </div>
        </div>
      )}

      {/* ── Tab: Blend ────────────────────────────────────── */}
      {activeTab === "blend" && (
        <div className="p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            Modo de mezcla
          </p>
          <div className="flex flex-col gap-1">
            {BLEND_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => commitBlendMode(mode.value)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                  currentBlend === mode.value
                    ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/40"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {mode.label}
                {currentBlend === mode.value && (
                  <span className="text-[9px] text-indigo-400">activo</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Sombra ───────────────────────────────────── */}
      {activeTab === "shadow" && (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Sombra
            </p>
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-[10px] text-zinc-500">
                {shadow.enabled ? "Activa" : "Inactiva"}
              </span>
              <input
                type="checkbox"
                checked={shadow.enabled}
                onChange={(e) => commitShadow({ enabled: e.target.checked })}
                className="accent-indigo-500"
              />
            </label>
          </div>

          {shadow.enabled && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Color</span>
                <input
                  type="color"
                  value={shadow.color}
                  onChange={(e) => commitShadow({ color: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5"
                />
                <span className="font-mono text-[10px] text-zinc-500">
                  {shadow.color}
                </span>
              </div>

              <ShadowSlider
                label="Desenfoque"
                value={shadow.blur}
                min={0}
                max={60}
                onChange={(v) => commitShadow({ blur: v })}
              />
              <ShadowSlider
                label="Offset X"
                value={shadow.offsetX}
                min={-50}
                max={50}
                onChange={(v) => commitShadow({ offsetX: v })}
              />
              <ShadowSlider
                label="Offset Y"
                value={shadow.offsetY}
                min={-50}
                max={50}
                onChange={(v) => commitShadow({ offsetY: v })}
              />
              <ShadowSlider
                label="Opacidad"
                value={Math.round(shadow.opacity * 100)}
                min={0}
                max={100}
                onChange={(v) => commitShadow({ opacity: v / 100 })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}