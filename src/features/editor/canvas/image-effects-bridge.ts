"use client";

import type { ImageElement, ImageShadow, BlendMode } from "@/entities/editor/document-schema";
import type { FabricImage } from "fabric";
import { filters as FabricFilters, Shadow } from "fabric";
import type { ImageEffectsState } from "@/entities/editor/image-effects";
import { hasAnyEffect } from "@/entities/editor/image-effects";

// ── Blend mode map ────────────────────────────────────────────
const BLEND_MODE_MAP: Record<BlendMode, string> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  "color-dodge": "color-dodge",
  "color-burn": "color-burn",
  "soft-light": "soft-light",
  "hard-light": "hard-light",
  difference: "difference",
  exclusion: "exclusion",
  luminosity: "luminosity",
};

// ── Aplicar efectos visuales completos ────────────────────────
export function applyImageEffectsToFabricImage(
  img: FabricImage,
  element: Pick<ImageElement, "effects" | "opacity" | "blendMode" | "shadow">,
): void {
  applyFiltersToFabricImage(img, element.effects as ImageEffectsState);
  applyBlendModeToFabricImage(img, element.blendMode);
  applyShadowToFabricImage(img, element.shadow);
}

// ── Filtros CSS/WebGL ─────────────────────────────────────────
function applyFiltersToFabricImage(
  img: FabricImage,
  effects: ImageEffectsState,
): void {
  if (!effects || effects.version !== 2) {
    img.filters = [];
    img.applyFilters();
    return;
  }

  if (!hasAnyEffect(effects)) {
    img.filters = [];
    img.applyFilters();
    return;
  }

  const newFilters: FabricImage["filters"] = [];

  if (effects.brightness !== 0) {
    newFilters.push(
      new FabricFilters.Brightness({ brightness: effects.brightness / 100 }),
    );
  }

  if (effects.contrast !== 0) {
    newFilters.push(
      new FabricFilters.Contrast({ contrast: effects.contrast / 100 }),
    );
  }

  if (effects.saturation !== 0) {
    newFilters.push(
      new FabricFilters.Saturation({ saturation: effects.saturation / 100 }),
    );
  }

  if (effects.grayscale > 0) {
    newFilters.push(new FabricFilters.Grayscale());
  }

  if (effects.sepia > 0) {
    newFilters.push(new FabricFilters.Sepia());
  }

  if (effects.hueRotation !== 0) {
    newFilters.push(
      new FabricFilters.HueRotation({ rotation: effects.hueRotation / 360 }),
    );
  }

  if (effects.blur > 0) {
    newFilters.push(
      new FabricFilters.Blur({ blur: effects.blur / 40 }),
    );
  }

  if (effects.pixelate > 1) {
    newFilters.push(
      new FabricFilters.Pixelate({ blocksize: Math.round(effects.pixelate) }),
    );
  }

  if (effects.noise > 0) {
    newFilters.push(
      new FabricFilters.Noise({ noise: effects.noise * 4 }),
    );
  }

  img.filters = newFilters;
  img.applyFilters();
}

// ── Blend mode ────────────────────────────────────────────────
function applyBlendModeToFabricImage(
  img: FabricImage,
  blendMode?: BlendMode,
): void {
  if (!blendMode || blendMode === "normal") {
    (img as any).globalCompositeOperation = "source-over";
    return;
  }
  const mapped = BLEND_MODE_MAP[blendMode] ?? "source-over";
  (img as any).globalCompositeOperation = mapped;
}

// ── Shadow ────────────────────────────────────────────────────
function applyShadowToFabricImage(
  img: FabricImage,
  shadow?: ImageShadow,
): void {
  if (!shadow?.enabled) {
    img.shadow = null;
    return;
  }

  const hex = shadow.color ?? "#000000";
  const opacity = Math.min(1, Math.max(0, shadow.opacity ?? 0.5));
  const rgba = hexToRgba(hex, opacity);

  img.shadow = new Shadow({
    color: rgba,
    blur: shadow.blur ?? 10,
    offsetX: shadow.offsetX ?? 5,
    offsetY: shadow.offsetY ?? 5,
  });
}

// ── Helper: hex → rgba ────────────────────────────────────────
function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${opacity})`;
  return `rgba(${r},${g},${b},${opacity})`;
}