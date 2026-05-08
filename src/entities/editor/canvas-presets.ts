// ── Formatos de canvas predefinidos ──────────────────────────

export type CanvasPresetCategory =
  | "imprenta"
  | "redes-sociales"
  | "presentacion"
  | "web"
  | "personalizado";

export type CanvasPreset = {
  id: string;
  label: string;
  category: CanvasPresetCategory;
  width: number;
  height: number;
  dpi: number;
  bleedMm: number;
  unit: "px" | "mm";
  description?: string;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  // ── Imprenta ──────────────────────────────────────────────
  {
    id: "a4-portrait",
    label: "A4 Vertical",
    category: "imprenta",
    width: 2480,
    height: 3508,
    dpi: 300,
    bleedMm: 3,
    unit: "mm",
    description: "210 × 297 mm — estándar internacional",
  },
  {
    id: "a4-landscape",
    label: "A4 Horizontal",
    category: "imprenta",
    width: 3508,
    height: 2480,
    dpi: 300,
    bleedMm: 3,
    unit: "mm",
    description: "297 × 210 mm",
  },
  {
    id: "a5-portrait",
    label: "A5 Vertical",
    category: "imprenta",
    width: 1748,
    height: 2480,
    dpi: 300,
    bleedMm: 3,
    unit: "mm",
    description: "148 × 210 mm",
  },
  {
    id: "a3-portrait",
    label: "A3 Vertical",
    category: "imprenta",
    width: 3508,
    height: 4961,
    dpi: 300,
    bleedMm: 5,
    unit: "mm",
    description: "297 × 420 mm",
  },
  {
    id: "business-card",
    label: "Tarjeta personal",
    category: "imprenta",
    width: 1063,
    height: 591,
    dpi: 300,
    bleedMm: 3,
    unit: "mm",
    description: "90 × 50 mm — estándar",
  },
  {
    id: "flyer-a5",
    label: "Flyer A5",
    category: "imprenta",
    width: 1748,
    height: 2480,
    dpi: 300,
    bleedMm: 3,
    unit: "mm",
    description: "148 × 210 mm",
  },
  {
    id: "flyer-dl",
    label: "Flyer DL",
    category: "imprenta",
    width: 1181,
    height: 2362,
    dpi: 300,
    bleedMm: 3,
    unit: "mm",
    description: "99 × 210 mm — tríptico",
  },
  {
    id: "poster-a2",
    label: "Póster A2",
    category: "imprenta",
    width: 4961,
    height: 7016,
    dpi: 300,
    bleedMm: 5,
    unit: "mm",
    description: "420 × 594 mm",
  },

  // ── Redes sociales ────────────────────────────────────────
  {
    id: "instagram-post",
    label: "Instagram Post",
    category: "redes-sociales",
    width: 1080,
    height: 1080,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1080 × 1080 px — cuadrado",
  },
  {
    id: "instagram-portrait",
    label: "Instagram Retrato",
    category: "redes-sociales",
    width: 1080,
    height: 1350,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1080 × 1350 px — 4:5",
  },
  {
    id: "instagram-story",
    label: "Instagram Story",
    category: "redes-sociales",
    width: 1080,
    height: 1920,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1080 × 1920 px — 9:16",
  },
  {
    id: "facebook-post",
    label: "Facebook Post",
    category: "redes-sociales",
    width: 1200,
    height: 630,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1200 × 630 px",
  },
  {
    id: "facebook-cover",
    label: "Facebook Cover",
    category: "redes-sociales",
    width: 1640,
    height: 624,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1640 × 624 px",
  },
  {
    id: "linkedin-post",
    label: "LinkedIn Post",
    category: "redes-sociales",
    width: 1200,
    height: 627,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1200 × 627 px",
  },
  {
    id: "linkedin-cover",
    label: "LinkedIn Cover",
    category: "redes-sociales",
    width: 1584,
    height: 396,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1584 × 396 px",
  },
  {
    id: "twitter-post",
    label: "Twitter/X Post",
    category: "redes-sociales",
    width: 1200,
    height: 675,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1200 × 675 px — 16:9",
  },
  {
    id: "youtube-thumbnail",
    label: "YouTube Thumbnail",
    category: "redes-sociales",
    width: 1280,
    height: 720,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "1280 × 720 px",
  },
  {
    id: "youtube-banner",
    label: "YouTube Banner",
    category: "redes-sociales",
    width: 2560,
    height: 1440,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "2560 × 1440 px",
  },

  // ── Presentación ──────────────────────────────────────────
  {
    id: "presentation-16-9",
    label: "Presentación 16:9",
    category: "presentacion",
    width: 1920,
    height: 1080,
    dpi: 96,
    bleedMm: 0,
    unit: "px",
    description: "1920 × 1080 px — Full HD",
  },
  {
    id: "presentation-4-3",
    label: "Presentación 4:3",
    category: "presentacion",
    width: 1024,
    height: 768,
    dpi: 96,
    bleedMm: 0,
    unit: "px",
    description: "1024 × 768 px",
  },

  // ── Web ───────────────────────────────────────────────────
  {
    id: "web-banner-leaderboard",
    label: "Banner Leaderboard",
    category: "web",
    width: 728,
    height: 90,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "728 × 90 px — IAB estándar",
  },
  {
    id: "web-banner-medium",
    label: "Banner Medium Rectangle",
    category: "web",
    width: 300,
    height: 250,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "300 × 250 px",
  },
  {
    id: "email-header",
    label: "Email Header",
    category: "web",
    width: 600,
    height: 200,
    dpi: 72,
    bleedMm: 0,
    unit: "px",
    description: "600 × 200 px",
  },
];

export const PRESET_CATEGORIES: Record<CanvasPresetCategory, string> = {
  imprenta: "Imprenta",
  "redes-sociales": "Redes sociales",
  presentacion: "Presentación",
  web: "Web / Digital",
  personalizado: "Personalizado",
};

export function getPresetById(id: string): CanvasPreset | null {
  return CANVAS_PRESETS.find((p) => p.id === id) ?? null;
}

export function getPresetsByCategory(
  category: CanvasPresetCategory,
): CanvasPreset[] {
  return CANVAS_PRESETS.filter((p) => p.category === category);
}

// ── Calcular dimensiones de canvas con sangrado ───────────────
export type CanvasWithBleed = {
  canvasWidth: number;
  canvasHeight: number;
  bleedPx: number;
  marginPx: number;
};

const MM_TO_PX_72DPI = 72 / 25.4;
const MM_TO_PX_300DPI = 300 / 25.4;

export function computeCanvasWithBleed(
  preset: CanvasPreset,
  marginMm = 10,
): CanvasWithBleed {
  const factor =
    preset.dpi >= 200 ? MM_TO_PX_300DPI : MM_TO_PX_72DPI;
  const bleedPx = Math.round(preset.bleedMm * factor);
  const marginPx = Math.round(marginMm * factor);
  return {
    canvasWidth: preset.width,
    canvasHeight: preset.height,
    bleedPx,
    marginPx,
  };
}

// ── Formato legible para UI ───────────────────────────────────
export function formatPresetDimensions(preset: CanvasPreset): string {
  if (preset.unit === "mm") {
    const wMm = Math.round((preset.width / (preset.dpi / 25.4)) * 10) / 10;
    const hMm = Math.round((preset.height / (preset.dpi / 25.4)) * 10) / 10;
    return `${wMm} × ${hMm} mm`;
  }
  return `${preset.width} × ${preset.height} px`;
}