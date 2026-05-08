"use client";

import type { ImageElement } from "@/entities/editor/document-schema";
import type { FabricImage } from "fabric";
import { filters as FabricFilters } from "fabric";
import type { ImageEffectsState } from "@/entities/editor/image-effects";
import { hasAnyEffect } from "@/entities/editor/image-effects";

/**
 * Convierte el estado de efectos en filtros Fabric y los aplica.
 * Reconstruye el array de filtros solo cuando es necesario.
 * Siempre llama applyFilters() para que Fabric renderice correctamente.
 */
export function applyImageEffectsToFabricImage(
  img: FabricImage,
  element: Pick<ImageElement, "effects" | "opacity">,
): void {
  const effects = element.effects as ImageEffectsState;

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

  // ── Brillo ────────────────────────────────────────────────
  if (effects.brightness !== 0) {
    newFilters.push(
      new FabricFilters.Brightness({
        brightness: effects.brightness / 100,
      }),
    );
  }

  // ── Contraste ─────────────────────────────────────────────
  if (effects.contrast !== 0) {
    newFilters.push(
      new FabricFilters.Contrast({
        contrast: effects.contrast / 100,
      }),
    );
  }

  // ── Saturación ────────────────────────────────────────────
  if (effects.saturation !== 0) {
    newFilters.push(
      new FabricFilters.Saturation({
        saturation: effects.saturation / 100,
      }),
    );
  }

  // ── Escala de grises ──────────────────────────────────────
  if (effects.grayscale > 0) {
    newFilters.push(new FabricFilters.Grayscale());
  }

  // ── Sépia ─────────────────────────────────────────────────
  if (effects.sepia > 0) {
    newFilters.push(new FabricFilters.Sepia());
  }

  // ── Hue rotation ─────────────────────────────────────────
  if (effects.hueRotation !== 0) {
    newFilters.push(
      new FabricFilters.HueRotation({
        rotation: effects.hueRotation / 360,
      }),
    );
  }

  // ── Blur ──────────────────────────────────────────────────
  if (effects.blur > 0) {
    newFilters.push(
      new FabricFilters.Blur({
        blur: effects.blur / 40,
      }),
    );
  }

  // ── Pixelado ──────────────────────────────────────────────
  if (effects.pixelate > 1) {
    newFilters.push(
      new FabricFilters.Pixelate({
        blocksize: Math.round(effects.pixelate),
      }),
    );
  }

  // ── Ruido / Grain ─────────────────────────────────────────
  if (effects.noise > 0) {
    newFilters.push(
      new FabricFilters.Noise({
        noise: effects.noise * 4,
      }),
    );
  }

  img.filters = newFilters;
  img.applyFilters();
}