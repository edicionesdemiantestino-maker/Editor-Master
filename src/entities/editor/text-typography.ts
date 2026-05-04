import type { TextElement, TextFontSource } from "./document-schema";

/**
 * Props de estilo de texto del editor (sin geometría ni `text` del contenido).
 * Conviven con `BaseElement`; el tipo `TextElement` las incorpora junto a `text`.
 */
export type EditorTextTypography = {
  fontSource: TextFontSource;
  /**
   * - `google`: nombre canónico en Google Fonts (ej. `"Inter"`, `"Open Sans"`).
   * - `system`: stack CSS completo (ej. `"ui-sans-serif, system-ui, sans-serif"`).
   */
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  textAlign: TextElement["textAlign"];
  lineHeight: number;
  letterSpacing: number;
  width?: number;
};

export const DEFAULT_EDITOR_TEXT_TYPOGRAPHY: EditorTextTypography = {
  fontSource: "google",
  fontFamily: "Inter",
  fontSize: 48,
  fontWeight: 600,
  fill: "#171717",
  textAlign: "left",
  lineHeight: 1.2,
  letterSpacing: 0,
};

/** Claves de tipografía en `TextElement` (no incluye `text`). */
export const TEXT_TYPOGRAPHY_KEYS = [
  "fontSource",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fill",
  "textAlign",
  "lineHeight",
  "letterSpacing",
  "width",
] as const satisfies readonly (keyof EditorTextTypography)[];

export type TextTypographyKey = (typeof TEXT_TYPOGRAPHY_KEYS)[number];

export function pickTextTypography(el: TextElement): EditorTextTypography {
  return {
    fontSource: el.fontSource,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fill: el.fill,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    ...(typeof el.width === "number" ? { width: el.width } : {}),
  };
}

export function mergeTextTypography(
  el: TextElement,
  patch: Partial<EditorTextTypography>,
): TextElement {
  return { ...el, ...patch };
}

/**
 * Garantiza defaults para documentos viejos o parciales.
 */
export function normalizeTextElement(el: TextElement): TextElement {
  return {
    ...DEFAULT_EDITOR_TEXT_TYPOGRAPHY,
    ...el,
    fontSource: el.fontSource ?? "system",
  };
}

/**
 * Valor `fontFamily` que recibe Fabric / canvas (CSS font shorthand compatible).
 */
export function toCanvasFontCSS(
  el: Pick<TextElement, "fontSource" | "fontFamily">,
): string {
  if (el.fontSource === "system") {
    return el.fontFamily;
  }
  const name = el.fontFamily.trim().replace(/\\/g, "").replace(/'/g, "");
  return `'${name}', ui-sans-serif, system-ui, sans-serif`;
}
