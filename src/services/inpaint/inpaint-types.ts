/**
 * Contrato del pipeline de inpainting / “borrador mágico”.
 * El proveedor concreto (p. ej. Replicate) implementa la llamada remota.
 */

export type InpaintSceneRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** ROI en píxeles del bitmap de la imagen (origen arriba-izquierda). */
export type InpaintImagePixelROI = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type InpaintRasterPayload = {
  /** PNG (p. ej. `data:image/png;base64,...`) del frame completo a procesar. */
  imageDataUrl: string;
  /** PNG en las mismas dimensiones lógicas que `imageDataUrl`; blanco = zona a inpaint. */
  maskDataUrl: string;
  /** Prompt opcional para modelos generativos. */
  prompt?: string;
};

export type InpaintRemoteResult = {
  /** URL HTTPS devuelta por el proveedor (p. ej. Replicate `output`). */
  outputUrl: string;
};

export type InpaintProviderRunInput = InpaintRasterPayload & {
  prompt?: string;
};

export type InpaintProvider = {
  readonly id: "replicate-sd-inpaint";
  run(input: InpaintProviderRunInput): Promise<InpaintRemoteResult>;
};
