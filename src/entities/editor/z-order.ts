import type { CanvasElement, ElementId } from "./document-schema";

export function reorderElements(
  elements: CanvasElement[],
  fromIndex: number,
  toIndex: number,
): CanvasElement[] {
  if (fromIndex === toIndex) return elements;
  const next = [...elements];
  const [removed] = next.splice(fromIndex, 1);
  if (!removed) return elements;
  next.splice(toIndex, 0, removed);
  return next;
}

export function elementIndexById(
  elements: CanvasElement[],
  id: ElementId,
): number {
  return elements.findIndex((e) => e.id === id);
}
