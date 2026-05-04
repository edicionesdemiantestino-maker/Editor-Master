import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logStructuredLine } from "@/lib/observability/structured-log";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTrustedRequestOrigin } from "@/lib/supabase/trusted-origin";

export async function GET(request: Request) {
  const requestId = randomUUID();
  const url = new URL(request.url);
  const { searchParams } = url;

  if (!isSupabaseConfigured()) {
    logStructuredLine(
      {
        service: "route/auth-callback",
        requestId,
        event: "supabase_not_configured",
        httpStatus: 503,
      },
      "warn",
    );
    return NextResponse.redirect(new URL("/", request.url));
  }

  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";

  const trustedOrigin = getTrustedRequestOrigin(request);

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logStructuredLine(
        {
          service: "route/auth-callback",
          requestId,
          event: "exchange_code_ok",
          httpStatus: 302,
        },
        "info",
      );
      return NextResponse.redirect(`${trustedOrigin}${next}`);
    }
    logStructuredLine(
      {
        service: "route/auth-callback",
        requestId,
        event: "exchange_code_failed",
        httpStatus: 401,
        code: "session_exchange_error",
      },
      "warn",
    );
  } else {
    logStructuredLine(
      {
        service: "route/auth-callback",
        requestId,
        event: "missing_oauth_code",
        httpStatus: 400,
      },
      "warn",
    );
  }

  return NextResponse.redirect(
    `${getTrustedRequestOrigin(request)}/login?error=auth`,
  );
}
