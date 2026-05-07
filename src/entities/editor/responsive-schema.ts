// ── Breakpoints ───────────────────────────────────────────────
export const BREAKPOINTS = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
} as const;

export type Viewport = keyof typeof BREAKPOINTS;

export const VIEWPORT_ORDER: Viewport[] = ["desktop", "tablet", "mobile"];

export const VIEWPORT_LABELS: Record<Viewport, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

export const VIEWPORT_ICONS: Record<Viewport, string> = {
  desktop: "🖥️",
  tablet: "📱",
  mobile: "📲",
};

// ── Responsive style override por elemento ────────────────────
export type ResponsiveStyleOverride = {
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  opacity?: number;
  visible?: boolean;
  scaleX?: number;
  scaleY?: number;
};

export type ResponsiveStyles = {
  base: ResponsiveStyleOverride;
  tablet?: ResponsiveStyleOverride;
  mobile?: ResponsiveStyleOverride;
};

// ── Auto-layout config ────────────────────────────────────────
export type LayoutDirection = "row" | "column";
export type LayoutAlign = "start" | "center" | "end" | "space-between";
export type LayoutConstraint = "fixed" | "fill" | "hug" | "scale";

export type AutoLayoutConfig = {
  direction: LayoutDirection;
  gap: number;
  paddingX: number;
  paddingY: number;
  align: LayoutAlign;
  justify: LayoutAlign;
  constraintH: LayoutConstraint;
  constraintV: LayoutConstraint;
};

// ── Resolver de estilos ───────────────────────────────────────
export function resolveResponsiveStyles(
  styles: ResponsiveStyles,
  viewport: Viewport,
): ResponsiveStyleOverride {
  const base = styles.base;
  if (viewport === "desktop") return base;
  const override =
    viewport === "tablet" ? styles.tablet : styles.mobile;
  if (!override) return base;
  return { ...base, ...override };
}

export function getViewportScale(
  canvasWidth: number,
  viewport: Viewport,
): number {
  if (viewport === "desktop") return 1;
  const target = BREAKPOINTS[viewport];
  return Math.min(1, target / canvasWidth);
}

export function createDefaultResponsiveStyles(): ResponsiveStyles {
  return { base: {} };
}

export function createDefaultAutoLayout(): AutoLayoutConfig {
  return {
    direction: "column",
    gap: 16,
    paddingX: 24,
    paddingY: 24,
    align: "start",
    justify: "start",
    constraintH: "fixed",
    constraintV: "fixed",
  };
}