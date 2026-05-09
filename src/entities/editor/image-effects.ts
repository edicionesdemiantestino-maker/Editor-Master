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

export type ImagePreset = {
  id: string;
  label: string;
  category: "mood" | "color" | "style" | "vintage";
  effects: Partial<Omit<ImageEffectsState, "version">>;
};

export const IMAGE_PRESETS: ImagePreset[] = [
  // ── Original ──────────────────────────────────────────────
  { id: "original", label: "Original", category: "style", effects: {} },

  // ── Mood ──────────────────────────────────────────────────
  {
    id: "cinematic",
    label: "Cinematic",
    category: "mood",
    effects: { brightness: -8, contrast: 25, saturation: -15, noise: 5 },
  },
  {
    id: "noir",
    label: "Noir",
    category: "mood",
    effects: { brightness: -10, contrast: 35, grayscale: 100, noise: 8 },
  },
  {
    id: "dreamy",
    label: "Dreamy",
    category: "mood",
    effects: { blur: 2, brightness: 18, contrast: -12, saturation: 15, sepia: 8 },
  },
  {
    id: "editorial",
    label: "Editorial",
    category: "mood",
    effects: { brightness: 5, contrast: 18, saturation: -8 },
  },

  // ── Color ─────────────────────────────────────────────────
  {
    id: "vivid",
    label: "Vívido",
    category: "color",
    effects: { brightness: 12, contrast: 20, saturation: 45 },
  },
  {
    id: "pastel",
    label: "Pastel",
    category: "color",
    effects: { brightness: 22, contrast: -18, saturation: -25 },
  },
  {
    id: "cold",
    label: "Frío",
    category: "color",
    effects: { contrast: 8, saturation: -12, hueRotation: 195 },
  },
  {
    id: "warm",
    label: "Cálido",
    category: "color",
    effects: { brightness: 8, contrast: 5, saturation: 15, hueRotation: 15 },
  },
  {
    id: "neon",
    label: "Neon",
    category: "color",
    effects: { brightness: -5, contrast: 30, saturation: 80, hueRotation: 270 },
  },

  // ── Style ─────────────────────────────────────────────────
  {
    id: "matte",
    label: "Mate",
    category: "style",
    effects: { brightness: 10, contrast: -18, saturation: -22, noise: 12 },
  },
  {
    id: "luxury",
    label: "Luxury",
    category: "style",
    effects: { brightness: -5, contrast: 15, saturation: -30, sepia: 15 },
  },
  {
    id: "startup",
    label: "Startup",
    category: "style",
    effects: { brightness: 10, contrast: 12, saturation: 20 },
  },
  {
    id: "pixel",
    label: "Pixel",
    category: "style",
    effects: { pixelate: 12, contrast: 10 },
  },

  // ── Vintage ───────────────────────────────────────────────
  {
    id: "sepia",
    label: "Sépia",
    category: "vintage",
    effects: { brightness: 5, saturation: -30, sepia: 80, noise: 5 },
  },
  {
    id: "retro",
    label: "Retro",
    category: "vintage",
    effects: { brightness: 8, contrast: -10, saturation: -20, sepia: 35, noise: 18 },
  },
  {
    id: "faded",
    label: "Faded",
    category: "vintage",
    effects: { brightness: 15, contrast: -25, saturation: -35, noise: 8 },
  },
];

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