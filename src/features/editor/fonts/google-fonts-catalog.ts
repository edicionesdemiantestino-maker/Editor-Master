/**
 * Familias disponibles en el editor (Google Fonts).
 * Debe coincidir con lo que cargamos en {@link loadGoogleFontFamily}.
 */
export const GOOGLE_FONT_OPTIONS = [
  { family: "Inter", label: "Inter" },
  { family: "Roboto", label: "Roboto" },
  { family: "Open Sans", label: "Open Sans" },
  { family: "Lato", label: "Lato" },
  { family: "Montserrat", label: "Montserrat" },
  { family: "Oswald", label: "Oswald" },
  { family: "Playfair Display", label: "Playfair Display" },
  { family: "Merriweather", label: "Merriweather" },
  { family: "Poppins", label: "Poppins" },
  { family: "Raleway", label: "Raleway" },
  { family: "Nunito", label: "Nunito" },
  { family: "Source Sans 3", label: "Source Sans 3" },
  { family: "Work Sans", label: "Work Sans" },
  { family: "Noto Sans", label: "Noto Sans" },
  { family: "DM Sans", label: "DM Sans" },
] as const;

export const GOOGLE_FONT_CANONICAL_NAMES: ReadonlySet<string> = new Set(
  GOOGLE_FONT_OPTIONS.map((o) => o.family),
);
