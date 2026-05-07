"use client";

import { create } from "zustand";
import type { Viewport } from "@/entities/editor/responsive-schema";
import {
  BREAKPOINTS,
  VIEWPORT_LABELS,
  VIEWPORT_ICONS,
  getViewportScale,
} from "@/entities/editor/responsive-schema";

// ── Store global de viewport ──────────────────────────────────
type ViewportStore = {
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
};

export const useViewportStore = create<ViewportStore>((set) => ({
  viewport: "desktop",
  setViewport: (viewport) => set({ viewport }),
}));

// ── Hook principal ────────────────────────────────────────────
export function useResponsivePreview(canvasWidth: number) {
  const { viewport, setViewport } = useViewportStore();

  const scale = getViewportScale(canvasWidth, viewport);
  const previewWidth = Math.round(BREAKPOINTS[viewport]);
  const isDesktop = viewport === "desktop";
  const isTablet = viewport === "tablet";
  const isMobile = viewport === "mobile";

  const label = VIEWPORT_LABELS[viewport];
  const icon = VIEWPORT_ICONS[viewport];

  return {
    viewport,
    setViewport,
    scale,
    previewWidth,
    isDesktop,
    isTablet,
    isMobile,
    label,
    icon,
  };
}

// ── Hook para el toolbar de breakpoints ───────────────────────
export type ViewportOption = {
  id: Viewport;
  label: string;
  icon: string;
  width: number;
  active: boolean;
};

export function useViewportOptions(): {
  options: ViewportOption[];
  current: Viewport;
  setViewport: (v: Viewport) => void;
} {
  const { viewport, setViewport } = useViewportStore();

  const options: ViewportOption[] = (
    Object.keys(BREAKPOINTS) as Viewport[]
  ).map((v) => ({
    id: v,
    label: VIEWPORT_LABELS[v],
    icon: VIEWPORT_ICONS[v],
    width: BREAKPOINTS[v],
    active: v === viewport,
  }));

  return { options, current: viewport, setViewport };
}