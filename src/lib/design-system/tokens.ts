// ── Design System Tokens — Editor Maestro ─────────────────────
// Fuente única de verdad para spacing, motion y elevation.

// ── Spacing ───────────────────────────────────────────────────
export const space = {
  0: "0px",
  1: "2px",
  2: "4px",
  3: "6px",
  4: "8px",
  5: "12px",
  6: "16px",
  7: "20px",
  8: "24px",
  9: "32px",
  10: "40px",
  11: "48px",
  12: "64px",
} as const;

// ── Control sizes ─────────────────────────────────────────────
export const controlSize = {
  xs: { height: "24px", px: "8px", text: "10px" },
  sm: { height: "28px", px: "10px", text: "11px" },
  md: { height: "32px", px: "12px", text: "12px" },
  lg: { height: "36px", px: "16px", text: "13px" },
} as const;

// ── Motion ────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant: "80ms",
    fast: "120ms",
    normal: "200ms",
    slow: "300ms",
    lazy: "400ms",
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    linear: "linear",
  },
} as const;

// ── Elevation ─────────────────────────────────────────────────
export const elevation = {
  0: "none",
  1: "0 1px 2px rgba(0,0,0,0.3)",
  2: "0 2px 8px rgba(0,0,0,0.4)",
  3: "0 4px 16px rgba(0,0,0,0.5)",
  4: "0 8px 32px rgba(0,0,0,0.6)",
  5: "0 16px 64px rgba(0,0,0,0.7)",
} as const;

// ── Border ────────────────────────────────────────────────────
export const border = {
  subtle: "0.5px solid rgba(255,255,255,0.05)",
  soft: "0.5px solid rgba(255,255,255,0.08)",
  medium: "0.5px solid rgba(255,255,255,0.12)",
  strong: "1px solid rgba(255,255,255,0.18)",
  accent: "1px solid rgba(99,102,241,0.4)",
} as const;

// ── Surface ───────────────────────────────────────────────────
export const surface = {
  base: "rgb(10,10,10)",
  raised: "rgb(18,18,18)",
  overlay: "rgb(22,22,24)",
  float: "rgba(20,20,22,0.95)",
  glass: "rgba(255,255,255,0.03)",
  glassHover: "rgba(255,255,255,0.06)",
} as const;

// ── Typography ────────────────────────────────────────────────
export const typography = {
  label: {
    xs: { size: "9px", weight: "600", tracking: "0.08em", transform: "uppercase" },
    sm: { size: "10px", weight: "600", tracking: "0.06em", transform: "uppercase" },
    md: { size: "11px", weight: "500", tracking: "0.02em", transform: "none" },
  },
  body: {
    xs: { size: "11px", weight: "400", tracking: "0" },
    sm: { size: "12px", weight: "400", tracking: "0" },
    md: { size: "13px", weight: "400", tracking: "0" },
  },
  value: {
    mono: { size: "11px", family: "ui-monospace, monospace", weight: "400" },
  },
} as const;

// ── Radius ────────────────────────────────────────────────────
export const radius = {
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  "2xl": "16px",
  full: "9999px",
} as const;

// ── CSS var helpers ───────────────────────────────────────────
export const transition = {
  fast: `all ${motion.duration.fast} ${motion.easing.standard}`,
  normal: `all ${motion.duration.normal} ${motion.easing.standard}`,
  slow: `all ${motion.duration.slow} ${motion.easing.decelerate}`,
  spring: `all ${motion.duration.slow} ${motion.easing.spring}`,
} as const;