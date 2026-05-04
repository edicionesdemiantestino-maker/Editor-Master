const loadedFamilies = new Set<string>();

function linkId(family: string): string {
  return `gf-${family.replace(/\s+/g, "-")}`;
}

/**
 * Carga una familia de Google Fonts (CSS en `<head>`). Idempotente.
 */
export function loadGoogleFontFamily(family: string): Promise<void> {
  const trimmed = family.trim();
  if (!trimmed) return Promise.resolve();
  if (loadedFamilies.has(trimmed)) return Promise.resolve();
  if (typeof document === "undefined") return Promise.resolve();

  const id = linkId(trimmed);
  if (document.getElementById(id)) {
    loadedFamilies.add(trimmed);
    return Promise.resolve();
  }

  const familyParam = encodeURIComponent(trimmed).replace(/%20/g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@300;400;500;600;700&display=swap`;

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      loadedFamilies.add(trimmed);
      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => resolve());
      } else {
        resolve();
      }
    };
    link.onerror = () =>
      reject(new Error(`No se pudo cargar la fuente: ${trimmed}`));
    document.head.appendChild(link);
  });
}
