// ── Design Tokens — Editor Maestro ───────────────────────────
// Centraliza spacing, tipografía, colores y radios.
// Compatible con Brand Kits — los tokens pueden ser sobreescritos
// por el kit activo en runtime.

// ── Spacing ───────────────────────────────────────────────────
export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
  10: 128,
} as const;

export type SpacingKey = keyof typeof SPACING;

export const SPACING_SCALE = Object.values(SPACING) as number[];

// ── Tipografía ────────────────────────────────────────────────
export const FONT_SIZE_SCALE = [
  12, 14, 16, 18, 20, 24, 28, 32, 36,
  40, 48, 56, 64, 72, 80, 96, 112, 128,
] as const;

export type FontSizeValue = (typeof FONT_SIZE_SCALE)[number];

export const FONT_WEIGHT_SCALE = [300, 400, 500, 600, 700] as const;
export type FontWeightValue = (typeof FONT_WEIGHT_SCALE)[number];

export const LINE_HEIGHT_SCALE = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 2] as const;

export const LETTER_SPACING_SCALE = [-2, -1, 0, 0.5, 1, 2, 4, 8] as const;

// ── Colores base ──────────────────────────────────────────────
export const BASE_COLORS = {
  // Neutros
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",

  // Zinc (UI base)
  zinc50: "#fafafa",
  zinc100: "#f4f4f5",
  zinc200: "#e4e4e7",
  zinc300: "#d4d4d8",
  zinc400: "#a1a1aa",
  zinc500: "#71717a",
  zinc600: "#52525b",
  zinc700: "#3f3f46",
  zinc800: "#27272a",
  zinc900: "#18181b",
  zinc950: "#09090b",

  // Indigo (brand)
  indigo400: "#818cf8",
  indigo500: "#6366f1",
  indigo600: "#4f46e5",

  // Emerald (success)
  emerald400: "#34d399",
  emerald500: "#10b981",

  // Amber (warning)
  amber400: "#fbbf24",
  amber500: "#f59e0b",

  // Red (danger)
  red400: "#f87171",
  red500: "#ef4444",

  // Violet (accent)
  violet400: "#a78bfa",
  violet500: "#8b5cf6",
} as const;

export type ColorToken = keyof typeof BASE_COLORS;

// ── Radios ────────────────────────────────────────────────────
export const BORDER_RADIUS = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 24,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof BORDER_RADIUS;

// ── Sombras (como string CSS) ─────────────────────────────────
export const SHADOWS = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.12)",
  md: "0 4px 6px rgba(0,0,0,0.15)",
  lg: "0 8px 16px rgba(0,0,0,0.18)",
  xl: "0 16px 32px rgba(0,0,0,0.22)",
} as const;

export type ShadowKey = keyof typeof SHADOWS;

// ── Token set (composición para Brand Kit) ────────────────────
export type DesignTokenSet = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    baseFontSize: number;
    baseLineHeight: number;
    baseLetterSpacing: number;
  };
  spacing: {
    base: number;
    scale: number[];
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
};

export const DEFAULT_TOKEN_SET: DesignTokenSet = {
  colors: {
    primary: BASE_COLORS.indigo500,
    secondary: BASE_COLORS.violet500,
    accent: BASE_COLORS.emerald500,
    background: BASE_COLORS.white,
    surface: BASE_COLORS.zinc50,
    text: BASE_COLORS.zinc900,
    textMuted: BASE_COLORS.zinc500,
  },
  typography: {
    fontFamily: "Inter",
    fontFamilyMono: "ui-monospace, monospace",
    baseFontSize: 16,
    baseLineHeight: 1.5,
    baseLetterSpacing: 0,
  },
  spacing: {
    base: 8,
    scale: SPACING_SCALE,
  },
  radii: {
    sm: BORDER_RADIUS.sm,
    md: BORDER_RADIUS.md,
    lg: BORDER_RADIUS.lg,
    full: BORDER_RADIUS.full,
  },
};

// ── Helpers ───────────────────────────────────────────────────
export function snapToSpacingScale(value: number): number {
  return SPACING_SCALE.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

export function snapToFontSizeScale(value: number): number {
  return [...FONT_SIZE_SCALE].reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

export function snapToGrid(value: number, grid = 8): number {
  return Math.round(value / grid) * grid;
}