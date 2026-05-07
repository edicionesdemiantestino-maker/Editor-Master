import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  ComponentDefinition,
  ComponentInstance,
  ComponentOverride,
} from "@/entities/editor/component-schema";
import {
  createComponentDefinition,
  createComponentInstance,
  resolveInstanceNodes,
} from "@/entities/editor/component-schema";
import type { CanvasElement } from "@/entities/editor/document-schema";
import { createElementId } from "@/entities/editor/defaults";

type ComponentState = {
  definitions: Record<string, ComponentDefinition>;
  instances: Record<string, ComponentInstance>;

  // Actions
  createComponent: (
    name: string,
    nodes: CanvasElement[],
    createdBy: string,
  ) => ComponentDefinition;

  instantiateComponent: (
    componentId: string,
    offsetX?: number,
    offsetY?: number,
  ) => ComponentInstance | null;

  updateDefinition: (
    componentId: string,
    nodes: CanvasElement[],
  ) => void;

  applyOverride: (
    instanceId: string,
    nodeId: string,
    patch: Partial<CanvasElement>,
  ) => void;

  removeOverride: (instanceId: string, nodeId: string) => void;

  deleteDefinition: (componentId: string) => void;
  deleteInstance: (instanceId: string) => void;

  getResolvedNodes: (instanceId: string) => CanvasElement[];

  renameDefinition: (componentId: string, name: string) => void;
};

export const useComponentStore = create<ComponentState>()(
  subscribeWithSelector((set, get) => ({
    definitions: {},
    instances: {},

    createComponent: (name, nodes, createdBy) => {
      const id = createElementId();
      const def = createComponentDefinition(id, name, nodes, createdBy);
      set((s) => ({
        definitions: { ...s.definitions, [id]: def },
      }));
      return def;
    },

    instantiateComponent: (componentId, offsetX = 0, offsetY = 0) => {
      const def = get().definitions[componentId];
      if (!def) return null;
      const id = createElementId();
      const instance = createComponentInstance(
        id,
        componentId,
        offsetX,
        offsetY,
      );
      set((s) => ({
        instances: { ...s.instances, [id]: instance },
      }));
      return instance;
    },

    updateDefinition: (componentId, nodes) => {
      set((s) => {
        const def = s.definitions[componentId];
        if (!def) return s;
        return {
          definitions: {
            ...s.definitions,
            [componentId]: {
              ...def,
              nodes,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },

    applyOverride: (instanceId, nodeId, patch) => {
      set((s) => {
        const instance = s.instances[instanceId];
        if (!instance) return s;

        const existing = instance.overrides.find(
          (o) => o.nodeId === nodeId,
        );
        const newOverrides: ComponentOverride[] = existing
          ? instance.overrides.map((o) =>
              o.nodeId === nodeId
                ? { ...o, patch: { ...o.patch, ...patch } }
                : o,
            )
          : [...instance.overrides, { nodeId, patch }];

        return {
          instances: {
            ...s.instances,
            [instanceId]: { ...instance, overrides: newOverrides },
          },
        };
      });
    },

    removeOverride: (instanceId, nodeId) => {
      set((s) => {
        const instance = s.instances[instanceId];
        if (!instance) return s;
        return {
          instances: {
            ...s.instances,
            [instanceId]: {
              ...instance,
              overrides: instance.overrides.filter(
                (o) => o.nodeId !== nodeId,
              ),
            },
          },
        };
      });
    },

    deleteDefinition: (componentId) => {
      set((s) => {
        const { [componentId]: _removed, ...restDefs } = s.definitions;
        const restInstances = Object.fromEntries(
          Object.entries(s.instances).filter(
            ([, v]) => v.componentId !== componentId,
          ),
        );
        return { definitions: restDefs, instances: restInstances };
      });
    },

    deleteInstance: (instanceId) => {
      set((s) => {
        const { [instanceId]: _removed, ...rest } = s.instances;
        return { instances: rest };
      });
    },

    getResolvedNodes: (instanceId) => {
      const { instances, definitions } = get();
      const instance = instances[instanceId];
      if (!instance) return [];
      const def = definitions[instance.componentId];
      if (!def) return [];
      return resolveInstanceNodes(def, instance);
    },

    renameDefinition: (componentId, name) => {
      set((s) => {
        const def = s.definitions[componentId];
        if (!def) return s;
        return {
          definitions: {
            ...s.definitions,
            [componentId]: {
              ...def,
              name: name.trim().slice(0, 100),
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
  })),
);

// ── Selectores ────────────────────────────────────────────────
export const selectAllDefinitions = (s: ComponentState) =>
  Object.values(s.definitions);

export const selectDefinitionById =
  (id: string) => (s: ComponentState) =>
    s.definitions[id] ?? null;

export const selectInstancesByComponent =
  (componentId: string) => (s: ComponentState) =>
    Object.values(s.instances).filter(
      (i) => i.componentId === componentId,
    );