import { randomUUID } from "node:crypto";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { logStructuredLine } from "@/lib/observability/structured-log";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RequireServerUserOk = {
  ok: true;
  userId: string;
  user: User;
  supabase: SupabaseClient;
};

export type RequireServerUserFail = {
  ok: false;
  status: 401 | 503;
  /** Código estable para respuestas JSON / mapping en acciones. */
  publicCode: "unauthorized" | "auth_backend_unavailable" | "auth_backend_error";
  /** Subcódigo solo para logs estructurados (no exponer al cliente). */
  logCode?: "no_session" | "supabase_getuser_error";
};

export type RequireServerUserResult = RequireServerUserOk | RequireServerUserFail;

/**
 * Sesión SSR + cliente Supabase listo para queries con RLS.
 * Usar en Route Handlers y Server Actions que requieren usuario autenticado.
 */
export async function requireServerUser(): Promise<RequireServerUserResult> {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, publicCode: "auth_backend_unavailable" };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      if (error) {
        logStructuredLine(
          {
            service: "lib/require-server-user",
            requestId,
            event: "get_user_failed",
            httpStatus: 401,
            // Código Supabase (p. ej. invalid JWT); no loguear cabeceras ni tokens.
            code: error.name,
          },
          "warn",
        );
      }
      return {
        ok: false,
        status: 401,
        publicCode: "unauthorized",
        logCode: error ? "supabase_getuser_error" : "no_session",
      };
    }
    return { ok: true, userId: user.id, user, supabase };
  } catch (e) {
    logStructuredLine(
      {
        service: "lib/require-server-user",
        requestId,
        event: "require_user_exception",
        httpStatus: 503,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
    return { ok: false, status: 503, publicCode: "auth_backend_error" };
  }
}
