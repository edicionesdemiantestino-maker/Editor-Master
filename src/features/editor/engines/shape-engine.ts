import { Rect, Circle, Line, Triangle, Ellipse, Polygon, Path } from "fabric";
import type { Canvas } from "fabric";
import { createElementId } from "@/entities/editor/defaults";
import { useEditorStore } from "../store/editor-store";
import type { CanvasElement } from "@/entities/editor/document-schema";

// ── Tipos de formas ───────────────────────────────────────────
export type ShapeType =
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "star"
  | "diamond"
  | "line"
  | "arrow";

export type ShapeStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rx?: number;
};

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  fill: "#6366f1",
  stroke: "transparent",
  strokeWidth: 0,
  opacity: 1,
  rx: 0,
};

// ── Insertar forma en canvas + store ──────────────────────────
export function insertShape(
  canvas: Canvas,
  type: ShapeType,
  style: ShapeStyle = DEFAULT_SHAPE_STYLE,
): void {
  const cW = canvas.width ?? 800;
  const cH = canvas.height ?? 600;
  const x = cW / 2 - 100;
  const y = cH / 2 - 100;
  const id = createElementId();

  // Crear objeto Fabric
  let fabricObj: any;

  switch (type) {
    case "rectangle":
      fabricObj = new Rect({
        left: x,
        top: y,
        width: 200,
        height: 150,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
        rx: 0,
        ry: 0,
      });
      break;

    case "rounded-rectangle":
      fabricObj = new Rect({
        left: x,
        top: y,
        width: 200,
        height: 150,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
        rx: 16,
        ry: 16,
      });
      break;

    case "circle":
      fabricObj = new Circle({
        left: x,
        top: y,
        radius: 90,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
      });
      break;

    case "ellipse":
      fabricObj = new Ellipse({
        left: x,
        top: y,
        rx: 120,
        ry: 70,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
      });
      break;

    case "triangle":
      fabricObj = new Triangle({
        left: x,
        top: y,
        width: 180,
        height: 160,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
      });
      break;

    case "diamond": {
      const dPath = "M 100 0 L 200 100 L 100 200 L 0 100 Z";
      fabricObj = new Path(dPath, {
        left: x,
        top: y,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
        scaleX: 1,
        scaleY: 1,
      });
      break;
    }

    case "star": {
      const starPath = generateStarPath(5, 90, 45);
      fabricObj = new Path(starPath, {
        left: x,
        top: y,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
      });
      break;
    }

    case "line":
      fabricObj = new Line([0, 0, 200, 0], {
        left: x,
        top: y + 75,
        stroke: style.fill,
        strokeWidth: Math.max(2, style.strokeWidth),
        opacity: style.opacity,
      });
      break;

    case "arrow": {
      const arrowPath = "M 0 10 L 160 10 M 140 0 L 160 10 L 140 20";
      fabricObj = new Path(arrowPath, {
        left: x,
        top: y + 65,
        stroke: style.fill,
        strokeWidth: Math.max(2, style.strokeWidth),
        fill: "transparent",
        opacity: style.opacity,
      });
      break;
    }

    default:
      return;
  }

  // Tag con ID
  (fabricObj as any).__editorId = id;
  canvas.add(fabricObj);
  canvas.setActiveObject(fabricObj);
  canvas.requestRenderAll();

  // Persistir en store como elemento genérico
  const store = useEditorStore.getState();
  store.pushHistoryAnchor();

  const shapeElement: CanvasElement = {
    id,
    type: "image", // Usamos image como base para formas hasta tener tipo shape
    locked: false,
    visible: true,
    opacity: style.opacity,
    src: `shape:${type}`,
    naturalWidth: 200,
    naturalHeight: 200,
    lockAspectRatio: false,
    effects: { version: 2, brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: 0, sepia: 0, pixelate: 1, hueRotation: 0, noise: 0 },
    transform: {
      x: fabricObj.left ?? x,
      y: fabricObj.top ?? y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      originX: "left",
      originY: "top",
    },
  } as any;

  store.replacePresent(
    {
      ...store.present,
      canvas: {
        ...store.present.canvas,
        elements: [...store.present.canvas.elements, shapeElement],
      },
    },
    "commit",
  );

  store.select([id]);
}

// ── Helpers ───────────────────────────────────────────────────
function generateStarPath(
  points: number,
  outerRadius: number,
  innerRadius: number,
): string {
  const cx = outerRadius;
  const cy = outerRadius;
  let path = "";
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    path += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
  }
  return path + " Z";
}

// ── Catalog para UI ───────────────────────────────────────────
export const SHAPE_CATALOG: {
  type: ShapeType;
  label: string;
  icon: string;
  shortcut?: string;
}[] = [
  { type: "rectangle", label: "Rectángulo", icon: "▬", shortcut: "R" },
  { type: "rounded-rectangle", label: "Rect. redondeado", icon: "▢" },
  { type: "circle", label: "Círculo", icon: "●", shortcut: "O" },
  { type: "ellipse", label: "Elipse", icon: "⬭" },
  { type: "triangle", label: "Triángulo", icon: "▲" },
  { type: "diamond", label: "Diamante", icon: "◆" },
  { type: "star", label: "Estrella", icon: "★" },
  { type: "line", label: "Línea", icon: "─", shortcut: "L" },
  { type: "arrow", label: "Flecha", icon: "→" },
];