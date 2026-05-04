"use client";

import { useEditorStore } from "../store/editor-store";
import { isTextElement } from "@/entities/editor/element-guards";

export function LayersPanel() {
  const elements = useEditorStore((s) => s.present.canvas.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Capas
      </h2>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {[...elements].reverse().map((el, idx) => {
          const label = isTextElement(el)
            ? el.text.slice(0, 28) + (el.text.length > 28 ? "…" : "")
            : "Imagen";
          const selected = selectedIds.includes(el.id);
          return (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => useEditorStore.getState().select([el.id])}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  selected
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-xs text-zinc-400">{elements.length - idx}.</span>{" "}
                {label || "(vacío)"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
