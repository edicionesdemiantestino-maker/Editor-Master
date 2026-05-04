import {
  EDITOR_DOCUMENT_VERSION,
  type CanvasElement,
  type EditorDocument,
  type ElementId,
  type ImageElement,
  type TextElement,
} from "@/entities/editor/document-schema";
import { createElementId } from "@/entities/editor/defaults";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import {
  createDefaultImageEffects,
  normalizeImageEffects,
} from "@/entities/editor/image-effects";
import {
  DEFAULT_EDITOR_TEXT_TYPOGRAPHY,
  normalizeTextElement,
} from "@/entities/editor/text-typography";

/** Copia profunda inmutable del documento (para historial / snapshots). */
export function cloneDocument(doc: EditorDocument): EditorDocument {
  return structuredClone(doc);
}

export function appendElementToDocument(
  doc: EditorDocument,
  element: CanvasElement,
): EditorDocument {
  return {
    ...doc,
    canvas: {
      ...doc.canvas,
      elements: [...doc.canvas.elements, element],
    },
  };
}

export function updateElementInDocument(
  doc: EditorDocument,
  id: ElementId,
  patch: Partial<CanvasElement>,
): EditorDocument {
  const elements = doc.canvas.elements.map((el) => {
    if (el.id !== id) return el;
    const merged = { ...el, ...patch } as CanvasElement;
    if (isTextElement(merged)) {
      return normalizeTextElement(merged);
    }
    if (isImageElement(merged)) {
      return normalizeImageElement(merged);
    }
    return merged;
  });
  return {
    ...doc,
    canvas: { ...doc.canvas, elements },
  };
}

export function removeElementFromDocument(
  doc: EditorDocument,
  id: ElementId,
): EditorDocument {
  return {
    ...doc,
    canvas: {
      ...doc.canvas,
      elements: doc.canvas.elements.filter((el) => el.id !== id),
    },
  };
}

export function createDefaultTextElement(doc: EditorDocument): TextElement {
  const id = createElementId();
  const raw: TextElement = {
    id,
    type: "text",
    locked: false,
    visible: true,
    opacity: 1,
    text: "Texto",
    ...DEFAULT_EDITOR_TEXT_TYPOGRAPHY,
    transform: {
      x: doc.canvas.width / 2 - 80,
      y: doc.canvas.height / 2 - 24,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      originX: "left",
      originY: "top",
    },
  };
  return normalizeTextElement(raw);
}

export function normalizeImageElement(el: ImageElement): ImageElement {
  return {
    ...el,
    lockAspectRatio: el.lockAspectRatio ?? true,
    effects: normalizeImageEffects(el.effects),
  };
}

function defaultElementTransform(): CanvasElement["transform"] {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    originX: "left",
    originY: "top",
  };
}

function normalizeElementTransform(raw: unknown): CanvasElement["transform"] {
  const d = defaultElementTransform();
  if (!raw || typeof raw !== "object") return d;
  const t = raw as Record<string, unknown>;
  const ox = t.originX;
  const oy = t.originY;
  return {
    x: typeof t.x === "number" ? t.x : d.x,
    y: typeof t.y === "number" ? t.y : d.y,
    rotation: typeof t.rotation === "number" ? t.rotation : d.rotation,
    scaleX: typeof t.scaleX === "number" ? t.scaleX : d.scaleX,
    scaleY: typeof t.scaleY === "number" ? t.scaleY : d.scaleY,
    originX:
      ox === "center" || ox === "right" || ox === "left" ? ox : d.originX,
    originY:
      oy === "center" || oy === "bottom" || oy === "top" ? oy : d.originY,
  };
}

/**
 * Reconstruye un {@link EditorDocument} desde JSON (p. ej. Supabase) con normalización de elementos.
 */
export function hydrateEditorDocument(
  raw: unknown,
  fallbackProjectId: string,
): EditorDocument {
  if (!raw || typeof raw !== "object") {
    throw new Error("Documento inválido: no es un objeto");
  }
  const o = raw as Record<string, unknown>;
  const canvasRaw = o.canvas;
  if (!canvasRaw || typeof canvasRaw !== "object") {
    throw new Error("Documento inválido: falta canvas");
  }
  const canvasObj = canvasRaw as Record<string, unknown>;
  const elementsRaw = canvasObj.elements;
  if (!Array.isArray(elementsRaw)) {
    throw new Error("Documento inválido: elements debe ser un array");
  }

  const projectId =
    typeof o.projectId === "string" && o.projectId.length > 0
      ? o.projectId
      : fallbackProjectId;

  const elements: CanvasElement[] = [];
  for (const item of elementsRaw) {
    if (!item || typeof item !== "object") continue;
    const t = (item as { type?: string }).type;

    if (t === "text") {
      const te = item as Partial<TextElement> & { type: "text" };
      elements.push(
        normalizeTextElement({
          ...te,
          id:
            typeof te.id === "string" && te.id.length > 0
              ? te.id
              : createElementId(),
          type: "text",
          locked: Boolean(te.locked),
          visible: te.visible !== false,
          opacity: typeof te.opacity === "number" ? te.opacity : 1,
          text: typeof te.text === "string" ? te.text : "Texto",
          transform: normalizeElementTransform(te.transform),
        } as TextElement),
      );
      continue;
    }

    if (t === "image") {
      const img = item as Partial<ImageElement> & { type: "image" };
      if (typeof img.src !== "string") continue;
      const full: ImageElement = {
        id:
          typeof img.id === "string" && img.id.length > 0
            ? img.id
            : createElementId(),
        type: "image",
        locked: Boolean(img.locked),
        visible: img.visible !== false,
        opacity: typeof img.opacity === "number" ? img.opacity : 1,
        src: img.src,
        naturalWidth:
          typeof img.naturalWidth === "number" && img.naturalWidth > 0
            ? img.naturalWidth
            : 1,
        naturalHeight:
          typeof img.naturalHeight === "number" && img.naturalHeight > 0
            ? img.naturalHeight
            : 1,
        lockAspectRatio: img.lockAspectRatio !== false,
        effects: normalizeImageEffects(img.effects),
        transform: normalizeElementTransform(img.transform),
        ...(img.crop &&
        typeof img.crop === "object" &&
        typeof (img.crop as { x?: unknown }).x === "number"
          ? { crop: img.crop as ImageElement["crop"] }
          : {}),
      };
      elements.push(normalizeImageElement(full));
    }
  }

  const metaRaw = o.meta;
  const meta =
    metaRaw && typeof metaRaw === "object"
      ? (metaRaw as EditorDocument["meta"])
      : { title: "Sin título", updatedAt: new Date().toISOString() };

  const canvas: EditorDocument["canvas"] = {
    width: typeof canvasObj.width === "number" ? canvasObj.width : 1080,
    height: typeof canvasObj.height === "number" ? canvasObj.height : 1350,
    backgroundColor:
      typeof canvasObj.backgroundColor === "string"
        ? canvasObj.backgroundColor
        : "#ffffff",
    ...(canvasObj.backgroundImage &&
    typeof canvasObj.backgroundImage === "object"
      ? {
          backgroundImage: canvasObj.backgroundImage as NonNullable<
            EditorDocument["canvas"]["backgroundImage"]
          >,
        }
      : {}),
    elements,
  };

  const base: EditorDocument = {
    version: EDITOR_DOCUMENT_VERSION,
    projectId,
    canvas,
    meta: {
      title: typeof meta.title === "string" ? meta.title : "Sin título",
      updatedAt:
        typeof meta.updatedAt === "string"
          ? meta.updatedAt
          : new Date().toISOString(),
    },
  };

  const fs = o.fabricSnapshot;
  if (fs && typeof fs === "object" && !Array.isArray(fs)) {
    return { ...base, fabricSnapshot: fs as Record<string, unknown> };
  }
  return base;
}

export function buildImageElement(
  doc: EditorDocument,
  input: { src: string; naturalWidth: number; naturalHeight: number },
): ImageElement {
  const id = createElementId();
  const maxW = doc.canvas.width * 0.72;
  const maxH = doc.canvas.height * 0.72;
  const scale = Math.min(
    maxW / input.naturalWidth,
    maxH / input.naturalHeight,
    1,
  );
  const displayW = input.naturalWidth * scale;
  const displayH = input.naturalHeight * scale;
  return {
    id,
    type: "image",
    locked: false,
    visible: true,
    opacity: 1,
    src: input.src,
    naturalWidth: input.naturalWidth,
    naturalHeight: input.naturalHeight,
    lockAspectRatio: true,
    effects: createDefaultImageEffects(),
    transform: {
      x: doc.canvas.width / 2 - displayW / 2,
      y: doc.canvas.height / 2 - displayH / 2,
      rotation: 0,
      scaleX: scale,
      scaleY: scale,
      originX: "left",
      originY: "top",
    },
  };
}

export function addImageElement(
  doc: EditorDocument,
  input: { src: string; naturalWidth: number; naturalHeight: number },
): EditorDocument {
  return appendElementToDocument(doc, buildImageElement(doc, input));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

function loadNaturalImageSize(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

export async function createImageElementFromFile(
  doc: EditorDocument,
  file: File,
): Promise<ImageElement> {
  const dataUrl = await readFileAsDataUrl(file);
  const { width, height } = await loadNaturalImageSize(dataUrl);
  return buildImageElement(doc, {
    src: dataUrl,
    naturalWidth: width,
    naturalHeight: height,
  });
}

export async function addImageElementFromFile(
  doc: EditorDocument,
  file: File,
): Promise<EditorDocument> {
  const el = await createImageElementFromFile(doc, file);
  return appendElementToDocument(doc, el);
}

export function addTextElement(doc: EditorDocument): EditorDocument {
  return appendElementToDocument(doc, createDefaultTextElement(doc));
}

export function applyFabricTransformToElement(
  el: CanvasElement,
  fabricLike: {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    originX: CanvasElement["transform"]["originX"];
    originY: CanvasElement["transform"]["originY"];
  },
): CanvasElement {
  return {
    ...el,
    transform: {
      x: fabricLike.left,
      y: fabricLike.top,
      rotation: fabricLike.angle,
      scaleX: fabricLike.scaleX,
      scaleY: fabricLike.scaleY,
      originX: fabricLike.originX,
      originY: fabricLike.originY,
    },
  };
}

export type FabricTextLike = {
  text?: string;
  fontSize?: number;
  fill?: string | object;
  fontFamily?: string;
  fontWeight?: number | string;
  textAlign?: string;
};

export function applyFabricTextProps(
  el: CanvasElement,
  fabricLike: FabricTextLike,
  inferFont?: (fabricCss: string) => Pick<TextElement, "fontSource" | "fontFamily">,
): CanvasElement {
  if (!isTextElement(el)) return el;
  let next: TextElement = { ...el };
  if (typeof fabricLike.text === "string") next.text = fabricLike.text;
  if (typeof fabricLike.fontSize === "number") next.fontSize = fabricLike.fontSize;
  if (typeof fabricLike.fill === "string") next.fill = fabricLike.fill;
  if (typeof fabricLike.fontWeight !== "undefined") {
    next.fontWeight = fabricLike.fontWeight as string | number;
  }
  if (typeof fabricLike.textAlign === "string") {
    const a = mapFabricTextAlignToModel(fabricLike.textAlign);
    if (a) next.textAlign = a;
  }
  if (typeof fabricLike.fontFamily === "string" && inferFont) {
    next = { ...next, ...inferFont(fabricLike.fontFamily) };
  }
  return next;
}

function mapFabricTextAlignToModel(
  align: string,
): TextElement["textAlign"] | null {
  if (align === "left" || align === "center" || align === "right") {
    return align;
  }
  if (align === "justify" || align === "justify-left" || align === "justify-center") {
    return "justify";
  }
  return null;
}
