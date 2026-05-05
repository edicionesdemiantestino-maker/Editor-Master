"use client";

import type { ReactNode } from "react";

import {
  useEditorPersistenceActions,
  useEditorPersistenceStatus,
} from "@/features/editor/persistence/editor-persistence-context";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useUsageSummary } from "@/features/billing/use-usage-summary";

type EditorToolbarCloudSaveProps = {
  projectId: string;
};

function formatSavedAt(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
}

/**
 * Guardado manual + estado de autosave; consume ambos contextos acotados a esta zona.
 */
export function EditorToolbarCloudSave({ projectId }: EditorToolbarCloudSaveProps) {
  const { isCloudPersistenceActive, requestManualSave } =
    useEditorPersistenceActions();
  const { saveStatus, saveErrorMessage, lastSavedAt } =
    useEditorPersistenceStatus();
  const { data } = useUsageSummary();

  const isRemoteProject = projectId !== "demo";
  const saveLocked = saveStatus === "saving";
  const canClick = isCloudPersistenceActive && !saveLocked;

  let statusNode: ReactNode = null;
  if (saveStatus === "saving") {
    statusNode = (
      <span
        className="text-xs font-medium text-amber-800 dark:text-amber-200"
        aria-live="polite"
      >
        Guardando…
      </span>
    );
  } else if (saveStatus === "saved" && lastSavedAt != null) {
    statusNode = (
      <span
        className="text-xs font-medium text-emerald-800 dark:text-emerald-200"
        aria-live="polite"
      >
        Guardado {formatSavedAt(lastSavedAt)}
      </span>
    );
  } else if (saveStatus === "error" && saveErrorMessage) {
    statusNode = (
      <span
        className="max-w-[14rem] truncate text-xs font-medium text-red-700 dark:text-red-300"
        title={saveErrorMessage}
        aria-live="assertive"
      >
        {saveErrorMessage}
      </span>
    );
  } else if (saveStatus === "idle" && lastSavedAt != null) {
    statusNode = (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Último guardado {formatSavedAt(lastSavedAt)}
      </span>
    );
  }

  const showCloudHint =
    isRemoteProject && isSupabaseConfigured() && !isCloudPersistenceActive;

  return (
    <>
      <button
        type="button"
        disabled={!canClick}
        title={
          !isRemoteProject
            ? "El demo local no se guarda en la nube."
            : !isSupabaseConfigured()
              ? "Configurá Supabase en .env.local."
              : !isCloudPersistenceActive
                ? "Esperá a que termine de cargar el proyecto."
                : saveLocked
                  ? "Guardado en curso…"
                  : "Guardar ahora en Supabase (además del autosave)."
        }
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-600"
        onClick={async () => {
          if (!canClick) return;
          const r = await requestManualSave();
          if (!r.ok && r.message) {
            window.alert(r.message);
          }
        }}
      >
        {saveLocked ? "Guardando…" : "Guardar"}
      </button>
      {statusNode}
      {data?.usage?.inpaint ? (
        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {data.usage.inpaint.used}/{data.usage.inpaint.limit} usos
        </span>
      ) : null}
      {showCloudHint ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Autosave al cargar el proyecto…
        </span>
      ) : null}
    </>
  );
}
