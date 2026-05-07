import type { CanvasElement } from "./document-schema";

// ── Component Definition ──────────────────────────────────────
export type ComponentPropType = "text" | "color" | "image" | "boolean" | "number";

export type ComponentPropDef = {
  key: string;
  label: string;
  type: ComponentPropType;
  defaultValue?: unknown;
};

export type ComponentDefinition = {
  readonly id: string;
  readonly name: string;
  /** Elementos que forman el componente (snapshot inmutable). */
  readonly nodes: readonly CanvasElement[];
  /** Props editables por instancia. */
  readonly props: readonly ComponentPropDef[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// ── Component Instance ────────────────────────────────────────
export type ComponentOverride = {
  /** ID del elemento dentro del componente. */
  nodeId: string;
  /** Patch parcial sobre el elemento. */
  patch: Partial<CanvasElement>;
};

export type ComponentInstance = {
  readonly id: string;
  /** ID del ComponentDefinition al que pertenece. */
  readonly componentId: string;
  /** Overrides locales de esta instancia. */
  readonly overrides: readonly ComponentOverride[];
  /** Props resueltas para esta instancia. */
  readonly props: Record<string, unknown>;
  /** Posición en el canvas (se suma al transform base del nodo). */
  readonly offsetX: number;
  readonly offsetY: number;
};

// ── Helpers ───────────────────────────────────────────────────
export function resolveInstanceNodes(
  definition: ComponentDefinition,
  instance: ComponentInstance,
): CanvasElement[] {
  return definition.nodes.map((node) => {
    const override = instance.overrides.find((o) => o.nodeId === node.id);
    const base: CanvasElement = {
      ...node,
      transform: {
        ...node.transform,
        x: node.transform.x + instance.offsetX,
        y: node.transform.y + instance.offsetY,
      },
    };
    if (!override) return base;
    return { ...base, ...override.patch } as CanvasElement;
  });
}

export function createComponentDefinition(
  id: string,
  name: string,
  nodes: CanvasElement[],
  createdBy: string,
): ComponentDefinition {
  const now = new Date().toISOString();
  return {
    id,
    name,
    nodes,
    props: [],
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function createComponentInstance(
  id: string,
  componentId: string,
  offsetX = 0,
  offsetY = 0,
): ComponentInstance {
  return {
    id,
    componentId,
    overrides: [],
    props: {},
    offsetX,
    offsetY,
  };
}