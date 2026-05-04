/**
 * Pipeline de efectos sobre imágenes del editor.
 * Hoy solo define estructura; la aplicación en Fabric vive en `image-effects-bridge`.
 *
 * Futuro: añadir variantes a `ImageEffectDescriptor` y mapear a `fabric.filters.*`.
 */

export type ImageEffectKind = "noop";

/** Un paso del pipeline (id estable para undo / diff). */
export type ImageEffectDescriptor = {
  readonly id: string;
  readonly kind: ImageEffectKind;
};

export type ImageEffectsState = {
  readonly version: 1;
  /** Orden de aplicación: el primero es el más “abajo” en la pila típica. */
  readonly pipeline: readonly ImageEffectDescriptor[];
};

export function createDefaultImageEffects(): ImageEffectsState {
  return { version: 1, pipeline: [] };
}

export function normalizeImageEffects(raw: unknown): ImageEffectsState {
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    (raw as ImageEffectsState).version === 1 &&
    Array.isArray((raw as ImageEffectsState).pipeline)
  ) {
    return raw as ImageEffectsState;
  }
  return createDefaultImageEffects();
}
