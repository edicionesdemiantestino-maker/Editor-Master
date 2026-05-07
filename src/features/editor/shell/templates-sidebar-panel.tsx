"use client";

import { useCallback, useEffect, useState } from "react";

import { hydrateEditorDocument } from "../store/document-mutations";
import { loadEditorDocument, useEditorStore } from "../store/editor-store";
import { bumpFabricSceneDirty } from "../persistence/fabric-scene-dirty-bus";

type TemplateRow = {
  id: string;
  name: string;
  preview_url?: string | null;
  document: unknown;
};

export function TemplatesSidebarPanel({ projectId }: { projectId: string }) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (projectId === "demo") {
      setTemplates([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", { credentials: "include" });
      const j = (await res.json()) as { templates?: TemplateRow[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? String(res.status));
      setTemplates(j.templates ?? []);
    } catch {
      setError("No se pudo cargar el marketplace.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const applyTemplate = useCallback(
    (t: TemplateRow) => {
      try {
        const doc = hydrateEditorDocument(t.document, projectId === "demo" ? "demo" : projectId);
        useEditorStore.getState().pushHistoryAnchor();
        loadEditorDocument(doc);
        bumpFabricSceneDirty();
      } catch {
        setError("Plantilla con formato incompatible.");
      }
    },
    [projectId],
  );

  if (projectId === "demo") {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">
        Iniciá sesión y abrí un proyecto remoto para ver plantillas de la cuenta.
      </p>
    );
  }

  if (loading) {
    return <p className="text-xs text-zinc-400">Cargando plantillas…</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}

      {!templates.length && !error ? (
        <p className="text-xs text-zinc-500">
          Aún no hay plantillas publicadas en Supabase (<code className="text-[10px] text-zinc-400">templates</code>).
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-2">
        {templates.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              title={t.name}
              onClick={() => applyTemplate(t)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-left shadow-sm transition hover:border-zinc-600"
            >
              {t.preview_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.preview_url}
                  alt=""
                  className="aspect-[4/5] w-full rounded-t-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center rounded-t-lg bg-zinc-900 text-[10px] text-zinc-500">
                  Sin preview
                </div>
              )}
              <p className="truncate px-1.5 py-1.5 text-[10px] font-medium text-zinc-200">{t.name}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
