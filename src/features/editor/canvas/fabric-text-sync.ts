"use client";

import type { TextElement } from "@/entities/editor/document-schema";
import { GOOGLE_FONT_CANONICAL_NAMES } from "../fonts/google-fonts-catalog";

/**
 * Infiere `fontSource` / `fontFamily` del modelo a partir del CSS que expone Fabric.
 */
export function inferTextFontFromFabricCss(
  fabricFontFamily: string,
): Pick<TextElement, "fontSource" | "fontFamily"> {
  const m = fabricFontFamily.match(/^['"]([^'"]+)['"]\s*,/);
  const inner = m?.[1]?.trim();
  if (inner && GOOGLE_FONT_CANONICAL_NAMES.has(inner)) {
    return { fontSource: "google", fontFamily: inner };
  }
  return { fontSource: "system", fontFamily: fabricFontFamily };
}
