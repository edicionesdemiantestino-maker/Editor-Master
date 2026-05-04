"use server";

/**
 * Checklist QA (manual) — integración Auth + projects + RLS:
 * - [ ] Login con email/contraseña u OAuth redirige sin perder sesión (middleware + cookies).
 * - [ ] Crear proyecto inserta fila con `user_id = auth.uid()` (sin aceptar user_id del cliente; ver `createProjectAction` en `./projects.ts`).
 * - [ ] Autosave y guardado manual persisten `data` + `name` + `updated_at`.
 * - [ ] Reload del editor restaura el mismo estado (documento canónico + snapshot Fabric opcional).
 * - [ ] UUID de otro usuario: get/save devuelven error de permiso (RLS + comprobación en acción).
 */

import { randomUUID } from "node:crypto";

import type { EditorDocument } from "@/entities/editor/document-schema";
import { safePublicErrorMessage } from "@/lib/api/safe-public-message";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { sanitizeSerializableDocument } from "@/features/editor/persistence/serialize-document";
import { hydrateEditorDocument } from "@/features/editor/store/document-mutations";
import {
  getProjectById,
  saveProjectDocument,
} from "@/services/projects/projects-service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRemoteProjectId(projectId: string): boolean {
  return projectId !== "demo" && UUID_RE.test(projectId);
}

export type SaveProjectResult =
  | { ok: true; requestId: string }
  | { ok: false; message: string; requestId: string };

export type GetProjectResult =
  | { ok: true; document: EditorDocument; requestId: string }
  | { ok: false; message: string; requestId: string };

/**
 * Persiste el documento canónico (modelo editor, no instancias Fabric).
 * Hidrata, sanea JSON y actualiza `projects.data` con sesión verificada en servidor.
 */
export async function saveProjectAction(
  projectId: string,
  document: unknown,
): Promise<SaveProjectResult> {
  const requestId = randomUUID();
  if (!isRemoteProjectId(projectId)) {
    return {
      ok: false,
      message: "Proyecto no válido para guardado en la nube.",
      requestId,
    };
  }

  try {
    const auth = await requireServerUser();
    if (!auth.ok) {
      logStructuredLine(
        {
          service: "actions/project-persistence",
          requestId,
          event: "save_project_auth_failed",
          httpStatus: auth.status,
          code: auth.publicCode,
        },
        "warn",
      );
      return {
        ok: false,
        message:
          auth.status === 503
            ? "Servicio de autenticación no disponible."
            : "Tenés que iniciar sesión para guardar.",
        requestId,
      };
    }

    const row = await getProjectById(auth.supabase, projectId);
    if (!row || row.user_id !== auth.userId) {
      logStructuredLine(
        {
          service: "actions/project-persistence",
          requestId,
          userId: auth.userId,
          event: "save_project_forbidden_or_missing",
          httpStatus: 403,
        },
        "warn",
      );
      return {
        ok: false,
        message: "No se encontró el proyecto o no tenés permiso para guardarlo.",
        requestId,
      };
    }

    const hydrated = hydrateEditorDocument(document, projectId);
    const toPersist = sanitizeSerializableDocument(hydrated);
    await saveProjectDocument(auth.supabase, projectId, toPersist);

    logStructuredLine(
      {
        service: "actions/project-persistence",
        requestId,
        userId: auth.userId,
        event: "save_project_ok",
        httpStatus: 200,
      },
      "info",
    );
    return { ok: true, requestId };
  } catch (e) {
    await reportServerException(
      { segment: "actions/project-persistence", requestId },
      e,
    );
    logStructuredLine(
      {
        service: "actions/project-persistence",
        requestId,
        event: "save_project_error",
        httpStatus: 500,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
    return {
      ok: false,
      message: safePublicErrorMessage(e, "No se pudo guardar el proyecto."),
      requestId,
    };
  }
}

/**
 * Carga el documento del proyecto con ownership verificado en servidor.
 */
export async function getProjectAction(
  projectId: string,
): Promise<GetProjectResult> {
  const requestId = randomUUID();
  if (!isRemoteProjectId(projectId)) {
    return {
      ok: false,
      message: "Proyecto no válido para cargar desde la nube.",
      requestId,
    };
  }

  try {
    const auth = await requireServerUser();
    if (!auth.ok) {
      logStructuredLine(
        {
          service: "actions/project-persistence",
          requestId,
          event: "get_project_auth_failed",
          httpStatus: auth.status,
          code: auth.publicCode,
        },
        "warn",
      );
      return {
        ok: false,
        message:
          auth.status === 503
            ? "Servicio de autenticación no disponible."
            : "Tenés que iniciar sesión para abrir este proyecto.",
        requestId,
      };
    }

    const row = await getProjectById(auth.supabase, projectId);
    if (!row || row.user_id !== auth.userId) {
      logStructuredLine(
        {
          service: "actions/project-persistence",
          requestId,
          userId: auth.userId,
          event: "get_project_forbidden_or_missing",
          httpStatus: 403,
        },
        "warn",
      );
      return {
        ok: false,
        message: "No se encontró el proyecto o no tenés permiso para verlo.",
        requestId,
      };
    }

    const document = sanitizeSerializableDocument(row.data);

    logStructuredLine(
      {
        service: "actions/project-persistence",
        requestId,
        userId: auth.userId,
        event: "get_project_ok",
        httpStatus: 200,
      },
      "info",
    );
    return { ok: true, document, requestId };
  } catch (e) {
    await reportServerException(
      { segment: "actions/project-persistence", requestId },
      e,
    );
    logStructuredLine(
      {
        service: "actions/project-persistence",
        requestId,
        event: "get_project_error",
        httpStatus: 500,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
    return {
      ok: false,
      message: safePublicErrorMessage(e, "No se pudo cargar el proyecto."),
      requestId,
    };
  }
}
