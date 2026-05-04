import type { CanvasElement, ImageElement, TextElement } from "./document-schema";

export function isTextElement(el: CanvasElement): el is TextElement {
  return el.type === "text";
}

export function isImageElement(el: CanvasElement): el is ImageElement {
  return el.type === "image";
}
