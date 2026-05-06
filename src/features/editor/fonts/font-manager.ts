const loadedFonts = new Set<string>();

export async function ensureFontLoaded(
  family: string,
  weights: number[] = [400],
) {
  const trimmed = family.trim();
  if (!trimmed) return;
  if (typeof document === "undefined") return;

  const key = `${trimmed}:${weights.join(",")}`;
  if (loadedFonts.has(key)) return;

  const weightsParam = weights.join(";");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${trimmed.replace(/ /g, "+")}:wght@${weightsParam}&display=swap`;
  document.head.appendChild(link);

  if (document.fonts?.load) {
    await document.fonts.load(`1rem "${trimmed}"`);
  }

  loadedFonts.add(key);
}

