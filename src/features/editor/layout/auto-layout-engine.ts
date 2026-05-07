import type { CanvasElement } from "@/entities/editor/document-schema";
import { isTextElement, isImageElement } from "@/entities/editor/element-guards";
import type {
  AutoLayoutConfig,
  LayoutAlign,
} from "@/entities/editor/responsive-schema";
import { snapToGrid } from "@/entities/editor/design-tokens";

// ── Dimensiones de un elemento ────────────────────────────────
export function getElementWidth(el: CanvasElement): number {
  const scaleX = el.transform.scaleX ?? 1;
  if (isTextElement(el)) {
    return (el.width ?? el.fontSize * el.text.length * 0.55) * scaleX;
  }
  if (isImageElement(el)) {
    return el.naturalWidth * scaleX;
  }
  return 100 * scaleX;
}

export function getElementHeight(el: CanvasElement): number {
  const scaleY = el.transform.scaleY ?? 1;
  if (isTextElement(el)) {
    return el.fontSize * el.lineHeight * scaleY;
  }
  if (isImageElement(el)) {
    return el.naturalHeight * scaleY;
  }
  return 50 * scaleY;
}

// ── Calcular posición de alineación ──────────────────────────
function resolveAlignOffset(
  align: LayoutAlign,
  containerSize: number,
  elementSize: number,
  index: number,
  count: number,
  totalSize: number,
  gap: number,
): number {
  switch (align) {
    case "center":
      return (containerSize - elementSize) / 2;
    case "end":
      return containerSize - elementSize;
    case "space-between":
      if (count <= 1) return 0;
      return index * ((containerSize - totalSize) / (count - 1) + elementSize + gap) - index * (elementSize + gap);
    default:
      return 0;
  }
}

// ── Layout vertical (column) ──────────────────────────────────
function applyColumnLayout(
  elements: CanvasElement[],
  config: AutoLayoutConfig,
  canvasWidth: number,
): CanvasElement[] {
  const { gap, paddingX, paddingY, align } = config;
  let currentY = paddingY;
  const result: CanvasElement[] = [];

  for (const el of elements) {
    const elW = getElementWidth(el);
    let x: number;

    switch (align) {
      case "center":
        x = snapToGrid((canvasWidth - elW) / 2);
        break;
      case "end":
        x = snapToGrid(canvasWidth - elW - paddingX);
        break;
      default:
        x = snapToGrid(paddingX);
    }

    result.push({
      ...el,
      transform: {
        ...el.transform,
        x,
        y: snapToGrid(currentY),
      },
    });

    currentY += getElementHeight(el) + gap;
  }

  return result;
}

// ── Layout horizontal (row) ───────────────────────────────────
function applyRowLayout(
  elements: CanvasElement[],
  config: AutoLayoutConfig,
  canvasWidth: number,
  canvasHeight: number,
): CanvasElement[] {
  const { gap, paddingX, paddingY, justify, align } = config;

  if (justify === "space-between" && elements.length > 1) {
    const totalW = elements.reduce((s, el) => s + getElementWidth(el), 0);
    const available = canvasWidth - paddingX * 2 - totalW;
    const spacing = Math.max(0, available / (elements.length - 1));
    let currentX = paddingX;

    return elements.map((el) => {
      const elH = getElementHeight(el);
      let y: number;
      switch (align) {
        case "center":
          y = snapToGrid((canvasHeight - elH) / 2);
          break;
        case "end":
          y = snapToGrid(canvasHeight - elH - paddingY);
          break;
        default:
          y = snapToGrid(paddingY);
      }
      const positioned = {
        ...el,
        transform: { ...el.transform, x: snapToGrid(currentX), y },
      };
      currentX += getElementWidth(el) + spacing;
      return positioned;
    });
  }

  let currentX = paddingX;
  return elements.map((el) => {
    const elH = getElementHeight(el);
    let y: number;
    switch (align) {
      case "center":
        y = snapToGrid((canvasHeight - elH) / 2);
        break;
      case "end":
        y = snapToGrid(canvasHeight - elH - paddingY);
        break;
      default:
        y = snapToGrid(paddingY);
    }
    const positioned = {
      ...el,
      transform: { ...el.transform, x: snapToGrid(currentX), y },
    };
    currentX += getElementWidth(el) + gap;
    return positioned;
  });
}

// ── API principal ─────────────────────────────────────────────
export type AutoLayoutResult = {
  elements: CanvasElement[];
  elementsChanged: string[];
};

export function applyAutoLayout(
  elements: CanvasElement[],
  config: AutoLayoutConfig,
  canvasWidth: number,
  canvasHeight: number,
): AutoLayoutResult {
  const originalPositions = new Map(
    elements.map((e) => [e.id, { x: e.transform.x, y: e.transform.y }]),
  );

  const updated =
    config.direction === "column"
      ? applyColumnLayout(elements, config, canvasWidth)
      : applyRowLayout(elements, config, canvasWidth, canvasHeight);

  const elementsChanged = updated
    .filter((el) => {
      const orig = originalPositions.get(el.id);
      return (
        orig &&
        (orig.x !== el.transform.x || orig.y !== el.transform.y)
      );
    })
    .map((el) => el.id);

  return { elements: updated, elementsChanged };
}

// ── Center in canvas ──────────────────────────────────────────
export function centerElementsInCanvas(
  elements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number,
  axis: "both" | "horizontal" | "vertical" = "both",
): CanvasElement[] {
  return elements.map((el) => {
    const elW = getElementWidth(el);
    const elH = getElementHeight(el);
    return {
      ...el,
      transform: {
        ...el.transform,
        x:
          axis === "both" || axis === "horizontal"
            ? snapToGrid((canvasWidth - elW) / 2)
            : el.transform.x,
        y:
          axis === "both" || axis === "vertical"
            ? snapToGrid((canvasHeight - elH) / 2)
            : el.transform.y,
      },
    };
  });
}

// ── Distribute evenly ─────────────────────────────────────────
export function distributeElements(
  elements: CanvasElement[],
  axis: "horizontal" | "vertical",
): CanvasElement[] {
  if (elements.length < 3) return elements;

  const sorted = [...elements].sort((a, b) =>
    axis === "horizontal"
      ? a.transform.x - b.transform.x
      : a.transform.y - b.transform.y,
  );

  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  const totalSize = sorted.reduce(
    (s, el) =>
      s +
      (axis === "horizontal" ? getElementWidth(el) : getElementHeight(el)),
    0,
  );

  const containerSize =
    axis === "horizontal"
      ? last.transform.x + getElementWidth(last) - first.transform.x
      : last.transform.y + getElementHeight(last) - first.transform.y;

  const spacing = (containerSize - totalSize) / (sorted.length - 1);
  let cursor =
    axis === "horizontal" ? first.transform.x : first.transform.y;

  const positioned = sorted.map((el) => {
    const updated = {
      ...el,
      transform: {
        ...el.transform,
        ...(axis === "horizontal"
          ? { x: snapToGrid(cursor) }
          : { y: snapToGrid(cursor) }),
      },
    };
    cursor +=
      (axis === "horizontal" ? getElementWidth(el) : getElementHeight(el)) +
      spacing;
    return updated;
  });

  // Restaurar orden original
  const byId = new Map(positioned.map((e) => [e.id, e]));
  return elements.map((e) => byId.get(e.id) ?? e);
}