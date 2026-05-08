// ── Catálogo de tipografías — Editor Maestro ─────────────────
// Todas las fuentes son de Google Fonts (carga dinámica)

export type FontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "cursiva"
  | "monospace"
  | "manuscrita"
  | "decorativa";

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type FontEntry = {
  family: string;
  category: FontCategory;
  weights: FontWeight[];
  preview?: string;
  tags?: string[];
};

export const FONT_CATALOG: FontEntry[] = [
  // ── Sans-serif ────────────────────────────────────────────
  { family: "Inter", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900], tags: ["moderno", "ui"] },
  { family: "Plus Jakarta Sans", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800], tags: ["moderno"] },
  { family: "DM Sans", category: "sans-serif", weights: [300, 400, 500, 600, 700], tags: ["moderno", "limpio"] },
  { family: "Outfit", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], tags: ["moderno"] },
  { family: "Syne", category: "sans-serif", weights: [400, 500, 600, 700, 800], tags: ["editorial", "display"] },
  { family: "Space Grotesk", category: "sans-serif", weights: [300, 400, 500, 600, 700], tags: ["tech"] },
  { family: "Manrope", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800], tags: ["moderno"] },
  { family: "Urbanist", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], tags: ["limpio"] },
  { family: "Nunito", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900], tags: ["amigable"] },
  { family: "Poppins", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900], tags: ["popular"] },
  { family: "Raleway", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], tags: ["elegante"] },
  { family: "Montserrat", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], tags: ["popular", "branding"] },
  { family: "Oswald", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700], tags: ["condensado", "impacto"] },
  { family: "Barlow Condensed", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800], tags: ["condensado"] },
  { family: "Bebas Neue", category: "display", weights: [400], tags: ["impacto", "condensado", "display"] },

  // ── Serif ─────────────────────────────────────────────────
  { family: "Playfair Display", category: "serif", weights: [400, 500, 600, 700, 800, 900], tags: ["editorial", "lujo"] },
  { family: "Cormorant Garamond", category: "serif", weights: [300, 400, 500, 600, 700], tags: ["lujo", "editorial"] },
  { family: "Libre Baskerville", category: "serif", weights: [400, 700], tags: ["clásico"] },
  { family: "Lora", category: "serif", weights: [400, 500, 600, 700], tags: ["editorial"] },
  { family: "Merriweather", category: "serif", weights: [300, 400, 700, 900], tags: ["lectura"] },
  { family: "EB Garamond", category: "serif", weights: [400, 500, 600, 700, 800], tags: ["clásico"] },
  { family: "DM Serif Display", category: "serif", weights: [400], tags: ["editorial", "display"] },
  { family: "Fraunces", category: "serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], tags: ["artístico"] },

  // ── Cursivas elegantes ────────────────────────────────────
  { family: "Great Vibes", category: "cursiva", weights: [400], tags: ["boda", "elegante", "caligrafía"] },
  { family: "Pinyon Script", category: "cursiva", weights: [400], tags: ["boda", "elegante", "caligrafía"] },
  { family: "Playfair Display SC", category: "cursiva", weights: [400, 700], tags: ["elegante"] },
  { family: "Alex Brush", category: "cursiva", weights: [400], tags: ["caligrafía", "elegante"] },
  { family: "Allura", category: "cursiva", weights: [400], tags: ["caligrafía", "boda"] },
  { family: "Italiana", category: "cursiva", weights: [400], tags: ["elegante", "fashion"] },
  { family: "Clicker Script", category: "cursiva", weights: [400], tags: ["caligrafía"] },
  { family: "Marck Script", category: "cursiva", weights: [400], tags: ["manuscrita"] },
  { family: "Mr De Haviland", category: "cursiva", weights: [400], tags: ["caligrafía", "elegante"] },
  { family: "Norican", category: "cursiva", weights: [400], tags: ["caligrafía"] },
  { family: "Rouge Script", category: "cursiva", weights: [400], tags: ["caligrafía", "elegante"] },
  { family: "Tangerine", category: "cursiva", weights: [400, 700], tags: ["caligrafía"] },
  { family: "UnifrakturMaguntia", category: "cursiva", weights: [400], tags: ["gótico", "medieval"] },
  { family: "Uncial Antiqua", category: "cursiva", weights: [400], tags: ["medieval"] },

  // ── Manuscritas / handwriting ─────────────────────────────
  { family: "Dancing Script", category: "manuscrita", weights: [400, 500, 600, 700], tags: ["manuscrita", "amigable"] },
  { family: "Pacifico", category: "manuscrita", weights: [400], tags: ["retro", "playful"] },
  { family: "Satisfy", category: "manuscrita", weights: [400], tags: ["caligrafía"] },
  { family: "Caveat", category: "manuscrita", weights: [400, 500, 600, 700], tags: ["apunte", "casual"] },
  { family: "Kalam", category: "manuscrita", weights: [300, 400, 700], tags: ["manuscrita"] },
  { family: "Permanent Marker", category: "manuscrita", weights: [400], tags: ["marcador", "bold"] },
  { family: "Rock Salt", category: "manuscrita", weights: [400], tags: ["grunge"] },
  { family: "Shadows Into Light", category: "manuscrita", weights: [400], tags: ["casual"] },
  { family: "Indie Flower", category: "manuscrita", weights: [400], tags: ["casual", "infantil"] },
  { family: "Patrick Hand", category: "manuscrita", weights: [400], tags: ["manuscrita"] },
  { family: "Architects Daughter", category: "manuscrita", weights: [400], tags: ["casual"] },
  { family: "Gloria Hallelujah", category: "manuscrita", weights: [400], tags: ["comic"] },
  { family: "Handlee", category: "manuscrita", weights: [400], tags: ["manuscrita"] },
  { family: "Amatic SC", category: "manuscrita", weights: [400, 700], tags: ["delicado", "artístico"] },

  // ── Display / decorativas ─────────────────────────────────
  { family: "Abril Fatface", category: "display", weights: [400], tags: ["display", "impacto"] },
  { family: "Righteous", category: "display", weights: [400], tags: ["retro", "display"] },
  { family: "Fredoka", category: "display", weights: [300, 400, 500, 600, 700], tags: ["redondeado", "amigable"] },
  { family: "Lobster", category: "display", weights: [400], tags: ["retro", "display"] },
  { family: "Lobster Two", category: "display", weights: [400, 700], tags: ["retro"] },
  { family: "Titan One", category: "display", weights: [400], tags: ["impacto", "display"] },
  { family: "Lilita One", category: "display", weights: [400], tags: ["display", "bold"] },
  { family: "Boogaloo", category: "display", weights: [400], tags: ["retro", "playful"] },
  { family: "Bangers", category: "display", weights: [400], tags: ["comic", "impacto"] },
  { family: "Black Ops One", category: "display", weights: [400], tags: ["militar", "gaming"] },
  { family: "Press Start 2P", category: "display", weights: [400], tags: ["pixel", "gaming", "retro"] },
  { family: "Creepster", category: "decorativa", weights: [400], tags: ["halloween", "terror"] },
  { family: "Cinzel", category: "display", weights: [400, 500, 600, 700, 800, 900], tags: ["romano", "clásico"] },
  { family: "Cinzel Decorative", category: "decorativa", weights: [400, 700, 900], tags: ["romano", "lujo"] },
  { family: "MedievalSharp", category: "decorativa", weights: [400], tags: ["medieval"] },
  { family: "Pirata One", category: "decorativa", weights: [400], tags: ["pirata", "medieval"] },

  // ── Monospace ─────────────────────────────────────────────
  { family: "Space Mono", category: "monospace", weights: [400, 700], tags: ["tech", "código"] },
  { family: "JetBrains Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700, 800], tags: ["código"] },
  { family: "Fira Code", category: "monospace", weights: [300, 400, 500, 600, 700], tags: ["código"] },
  { family: "Roboto Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700], tags: ["código"] },
  { family: "Source Code Pro", category: "monospace", weights: [200, 300, 400, 500, 600, 700, 800, 900], tags: ["código"] },
];

export const FONT_CATEGORIES: Record<FontCategory, string> = {
  "sans-serif": "Sans-serif",
  "serif": "Serif",
  "display": "Display",
  "cursiva": "Cursivas",
  "monospace": "Monospace",
  "manuscrita": "Manuscritas",
  "decorativa": "Decorativas",
};

export const CATEGORY_ORDER: FontCategory[] = [
  "sans-serif",
  "serif",
  "cursiva",
  "manuscrita",
  "display",
  "decorativa",
  "monospace",
];

// ── Helpers ───────────────────────────────────────────────────
export function getFontsByCategory(cat: FontCategory): FontEntry[] {
  return FONT_CATALOG.filter((f) => f.category === cat);
}

export function searchFonts(query: string): FontEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return FONT_CATALOG;
  return FONT_CATALOG.filter(
    (f) =>
      f.family.toLowerCase().includes(q) ||
      f.tags?.some((t) => t.includes(q)),
  );
}

export function buildGoogleFontsUrl(families: string[]): string {
  if (families.length === 0) return "";
  const params = families
    .map((f) => `family=${encodeURIComponent(f)}:ital,wght@0,400;1,400`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function getFontEntry(family: string): FontEntry | null {
  return FONT_CATALOG.find(
    (f) => f.family.toLowerCase() === family.toLowerCase(),
  ) ?? null;
}