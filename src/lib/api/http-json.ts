import { NextResponse } from "next/server";

/** Respuesta JSON homogénea para Route Handlers (códigos estables, sin secretos). */
export function jsonPublicError(
  requestId: string,
  status: number,
  publicCode: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: publicCode, requestId, ...extra },
    { status, headers: { "X-Request-Id": requestId } },
  );
}
