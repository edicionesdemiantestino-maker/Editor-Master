"use client";

import { useMemo, useCallback, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { isImageElement } from "@/entities/editor/element-guards";
import type { ImageElement, BlendMode, ImageShadow } from "@/entities/editor/document-schema";
import type { ImageEffectsState } from "@/entities/editor/image-effects";
import { createDefaultImageEffects, IMAGE_PRESETS } from "@/entities/editor/image-effects";
import { Section, PremiumSlider, PanelDivider } from "@/lib/design-system/primitives";
import { border, surface, motion, radius, typography } from "@/lib/design-system/tokens";

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

const TABS = [
  { id: "presets", label: "Presets" },
  { id: "adjust", label: "Ajustar" },
  { id: "blend", label: "Blend" },
  { id: "shadow", label: "Sombra" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ImageEffectsPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const [presetCategory, setPresetCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabId>("presets");

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
      useEditorStore.getState().updateElement(
        selectedImage.id,
        { effects: { ...createDefaultImageEffects(), ...preset.effects } } as Partial<ImageElement>,
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

  if (!selectedImage) return null;

  const effects = selectedImage.effects as ImageEffectsState;
  const safe = {
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
  const filteredPresets = presetCategory === "all"
    ? IMAGE_PRESETS
    : IMAGE_PRESETS.filter((p) => p.category === presetCategory);

  return (
    <div className="flex flex-col">

      {/* Tabs */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: border.subtle }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2"
            style={{
              fontSize: typography.label.xs.size,
              fontWeight: typography.label.xs.weight,
              letterSpacing: typography.label.xs.tracking,
              textTransform: "uppercase",
              color:
                activeTab === tab.id
                  ? "rgba(99,102,241,0.9)"
                  : "rgba(255,255,255,0.2)",
              borderBottom:
                activeTab === tab.id
                  ? "1.5px solid rgba(99,102,241,0.7)"
                  : "1.5px solid transparent",
              transition: `all ${motion.duration.fast}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reset */}
      <div className="flex justify-end px-3 pt-1.5">
        <button
          type="button"
          onClick={resetAll}
          style={{
            fontSize: "9px",
            color: "rgba(255,255,255,0.15)",
            transition: `color ${motion.duration.fast}`,
          }}
          className="hover:text-indigo-400"
        >
          resetear todo
        </button>
      </div>

      {/* ── Presets ───────────────────────────────────────── */}
      {activeTab === "presets" && (
        <Section label="Filtros">
          <div className="mb-2 flex gap-1 overflow-x-auto">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPresetCategory(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: "3px 8px",
                  borderRadius: radius.sm,
                  fontSize: "10px",
                  fontWeight: "500",
                  transition: `all ${motion.duration.fast}`,
                  background:
                    presetCategory === cat.id
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color:
                    presetCategory === cat.id
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.2)",
                }}
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
                style={{
                  padding: "8px 4px",
                  borderRadius: radius.md,
                  fontSize: "10px",
                  fontWeight: "500",
                  background: surface.glass,
                  border: border.subtle,
                  color: "rgba(255,255,255,0.35)",
                  transition: `all ${motion.duration.fast}`,
                }}
                className="hover:border-white/15 hover:text-white/60"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Ajustar ───────────────────────────────────────── */}
      {activeTab === "adjust" && (
        <>
          <Section label="Luz y color">
            <PremiumSlider label="Brillo" value={safe.brightness} min={-100} max={100} defaultValue={0} onChange={(v) => commitEffect("brightness", v)} />
            <PremiumSlider label="Contraste" value={safe.contrast} min={-100} max={100} defaultValue={0} onChange={(v) => commitEffect("contrast", v)} />
            <PremiumSlider label="Saturación" value={safe.saturation} min={-100} max={100} defaultValue={0} onChange={(v) => commitEffect("saturation", v)} />
            <PremiumSlider label="Tono" value={safe.hueRotation} min={0} max={360} defaultValue={0} onChange={(v) => commitEffect("hueRotation", v)} />
          </Section>
          <Section label="Filtros">
            <PremiumSlider label="Grises" value={safe.grayscale} min={0} max={100} defaultValue={0} onChange={(v) => commitEffect("grayscale", v)} />
            <PremiumSlider label="Sépia" value={safe.sepia} min={0} max={100} defaultValue={0} onChange={(v) => commitEffect("sepia", v)} />
          </Section>
          <Section label="Efectos">
            <PremiumSlider label="Blur" value={safe.blur} min={0} max={40} step={0.5} defaultValue={0} onChange={(v) => commitEffect("blur", v)} />
            <PremiumSlider label="Pixelado" value={safe.pixelate} min={1} max={50} defaultValue={1} onChange={(v) => commitEffect("pixelate", v)} />
            <PremiumSlider label="Grain" value={safe.noise} min={0} max={100} defaultValue={0} onChange={(v) => commitEffect("noise", v)} />
          </Section>
        </>
      )}

      {/* ── Blend ─────────────────────────────────────────── */}
      {activeTab === "blend" && (
        <Section label="Modo de mezcla">
          <div className="flex flex-col gap-0.5">
            {BLEND_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => commitBlendMode(mode.value)}
                className="flex items-center justify-between text-left"
                style={{
                  padding: "6px 10px",
                  borderRadius: radius.md,
                  fontSize: "11px",
                  transition: `all ${motion.duration.fast}`,
                  background:
                    currentBlend === mode.value
                      ? "rgba(99,102,241,0.12)"
                      : "transparent",
                  color:
                    currentBlend === mode.value
                      ? "rgba(99,102,241,0.9)"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                {mode.label}
                {currentBlend === mode.value && (
                  <span style={{ fontSize: "9px", color: "rgba(99,102,241,0.6)" }}>
                    ●
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Sombra ────────────────────────────────────────── */}
      {activeTab === "shadow" && (
        <Section
          label="Sombra"
          action={
            <label className="flex cursor-pointer items-center gap-2">
              <span style={{ fontSize: "9px", color: shadow.enabled ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.2)" }}>
                {shadow.enabled ? "activa" : "inactiva"}
              </span>
              <input
                type="checkbox"
                checked={shadow.enabled}
                onChange={(e) => commitShadow({ enabled: e.target.checked })}
                className="accent-indigo-500"
              />
            </label>
          }
        >
          {shadow.enabled && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="color"
                  value={shadow.color}
                  onChange={(e) => commitShadow({ color: e.target.value })}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: radius.sm,
                    border: border.soft,
                    background: "transparent",
                    padding: "2px",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "10px", fontFamily: "ui-monospace", color: "rgba(255,255,255,0.25)" }}>
                  {shadow.color}
                </span>
              </div>
              <PremiumSlider label="Blur" value={shadow.blur} min={0} max={60} defaultValue={10} onChange={(v) => commitShadow({ blur: v })} />
              <PremiumSlider label="Offset X" value={shadow.offsetX} min={-50} max={50} defaultValue={5} onChange={(v) => commitShadow({ offsetX: v })} />
              <PremiumSlider label="Offset Y" value={shadow.offsetY} min={-50} max={50} defaultValue={5} onChange={(v) => commitShadow({ offsetY: v })} />
              <PremiumSlider label="Opacidad" value={Math.round(shadow.opacity * 100)} min={0} max={100} unit="%" defaultValue={50} onChange={(v) => commitShadow({ opacity: v / 100 })} />
            </>
          )}
        </Section>
      )}
    </div>
  );
}