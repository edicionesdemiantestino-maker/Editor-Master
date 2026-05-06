export const GOOGLE_FONT_OPTIONS = [
  {
    family: "Inter",
    label: "Inter",
    category: "sans",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Playfair Display",
    label: "Playfair",
    category: "serif",
    weights: [400, 600, 700],
  },
  {
    family: "Montserrat",
    label: "Montserrat",
    category: "sans",
    weights: [400, 500, 700],
  },
  {
    family: "Bebas Neue",
    label: "Bebas",
    category: "display",
    weights: [400],
  },
  {
    family: "Poppins",
    label: "Poppins",
    category: "sans",
    weights: [300, 400, 600],
  },
] as const;

export const GOOGLE_FONT_CANONICAL_NAMES: ReadonlySet<string> = new Set(
  GOOGLE_FONT_OPTIONS.map((o) => o.family),
);
