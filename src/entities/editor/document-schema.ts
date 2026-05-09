/**
 * Modelo canónico del documento (serializable → Supabase / historial).
 * Fabric es proyección; estos tipos son la fuente de verdad.
 */

import type { ImageEffectsState } from "./image-effects";

export type ElementId = string;
export type ProjectId = string;

export const EDITOR_DOCUMENT_VERSION = 1 as const;

/** Origen de la familia tipográfica del texto. */
export type TextFontSource = "google" | "system";

export type BaseElement = {
  id: ElementId;
  locked: boolean;
  visible: boolean;
  opacity: number;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    originX: "left" | "center" | "right";
    originY: "top" | "center" | "bottom";
  };
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontSource: TextFontSource;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  textAlign: "left" | "center" | "right" | "justify";
  lineHeight: number;
  letterSpacing: number;
  width?: number;
};

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "soft-light"
  | "hard-light"
  | "difference"
  | "exclusion"
  | "luminosity";

export type ImageShadow = {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
};

export type ImageElement = BaseElement & {
  type: "image";
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  lockAspectRatio: boolean;
  effects: ImageEffectsState;
  blendMode?: BlendMode;
  shadow?: ImageShadow;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type CanvasElement = TextElement | ImageElement;

export type EditorCanvas = {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: {
    src: string;
    fit: "cover" | "contain" | "stretch";
  };
  /** Índice 0 = capa inferior (fondo). */
  elements: CanvasElement[];
};

export type EditorDocument = {
  version: typeof EDITOR_DOCUMENT_VERSION;
  projectId: ProjectId;
  canvas: EditorCanvas;
  meta: {
    title: string;
    updatedAt: string;
  };
  /**
   * Snapshot opcional de Fabric (`canvas.toJSON()`), persistido junto al modelo canónico.
   * La fuente de verdad sigue siendo `canvas.elements`; esto sirve para interoperabilidad,
   * auditoría y futuras herramientas de importación (`loadFabricJsonOntoCanvas`).
   */
  fabricSnapshot?: Record<string, unknown>;
};
