/**
 * Modelo de efectos de imagen — Editor Maestro
 * Serializable, realtime-safe, compatible con undo/redo.
 */

export type ImageEffectsState = {
  readonly version: 2;
  readonly brightness: number;   // -100 a 100, default 0
  readonly contrast: number;     // -100 a 100, default 0
  readonly saturation: number;   // -100 a 100, default 0
  readonly blur: number;         // 0 a 40, default 0
  readonly grayscale: number;    // 0 a 100, default 0
  readonly sepia: number;        // 0 a 100, default 0
  readonly pixelate: number;     // 1 a 50, default 1
  readonly hueRotation: number;  // 0 a 360, default 0
  readonly noise: number;        // 0 a 100, default 0
};

export function createDefaultImageEffects(): ImageEffectsState {
  return {
    version: 2,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    pixelate: 1,
    hueRotation: 0,
    noise: 0,
  };
}

export function normalizeImageEffects(raw: unknown): ImageEffectsState {
  const defaults = createDefaultImageEffects();
  if (!raw || typeof raw !== "object") return defaults;
  const r = raw as Record<string, unknown>;

  // Migrar desde versión 1 (pipeline array) → versión 2 (flat object)
  if (r.version === 1 || Array.isArray(r.pipeline)) {
    return defaults;
  }

  return {
    version: 2,
    brightness: clamp(num(r.brightness, 0), -100, 100),
    contrast: clamp(num(r.contrast, 0), -100, 100),
    saturation: clamp(num(r.saturation, 0), -100, 100),
    blur: clamp(num(r.blur, 0), 0, 40),
    grayscale: clamp(num(r.grayscale, 0), 0, 100),
    sepia: clamp(num(r.sepia, 0), 0, 100),
    pixelate: clamp(num(r.pixelate, 1), 1, 50),
    hueRotation: clamp(num(r.hueRotation, 0), 0, 360),
    noise: clamp(num(r.noise, 0), 0, 100),
  };
}

export function hasAnyEffect(effects: ImageEffectsState): boolean {
  return (
    effects.brightness !== 0 ||
    effects.contrast !== 0 ||
    effects.saturation !== 0 ||
    effects.blur > 0 ||
    effects.grayscale > 0 ||
    effects.sepia > 0 ||
    effects.pixelate > 1 ||
    effects.hueRotation !== 0 ||
    effects.noise > 0
  );
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}