"use server";

import { randomUUID } from "node:crypto";

import { safePublicErrorMessage } from "@/lib/api/safe-public-message";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { createProject } from "@/services/projects/projects-service";

export async function createProjectAction(): Promise<
  { ok: true; id: string; requestId: string } | { ok: false; message: string }
> {
  const requestId = randomUUID();

  try {
    const auth = await requireServerUser();
    if (!auth.ok) {
      logStructuredLine(
        {
          service: "actions/projects",
          requestId,
          event: "create_project_auth_failed",
          httpStatus: auth.status,
          code: auth.logCode ?? auth.publicCode,
        },
        "warn",
      );
      if (auth.status === 503) {
        return {
          ok: false,
          message:
            auth.publicCode === "auth_backend_unavailable"
              ? "Supabase no está configurado."
              : "Servicio de autenticación no disponible.",
        };
      }
      return { ok: false, message: "Tenés que iniciar sesión." };
    }

    const rl = await rateLimitService.consumeCreateProject(auth.userId);
    if (!rl.allowed) {
      logStructuredLine(
        {
          service: "actions/projects",
          requestId,
          userId: auth.userId,
          event: "create_project_rate_limited",
          httpStatus: 429,
        },
        "warn",
      );
      return {
        ok: false,
        message:
          "Creaste demasiados proyectos en poco tiempo. Probá de nuevo en un minuto.",
      };
    }

    const id = await createProject(auth.supabase);
    logStructuredLine(
      {
        service: "actions/projects",
        requestId,
        userId: auth.userId,
        event: "create_project_ok",
        httpStatus: 200,
      },
      "info",
    );
    return { ok: true, id, requestId };
  } catch (e) {
    await reportServerException({ segment: "actions/projects", requestId }, e);
    logStructuredLine(
      {
        service: "actions/projects",
        requestId,
        event: "create_project_error",
        httpStatus: 500,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
    return {
      ok: false,
      message: safePublicErrorMessage(e, "No se pudo crear el proyecto."),
    };
  }
}
