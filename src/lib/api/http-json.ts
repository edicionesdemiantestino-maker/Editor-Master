import { NextResponse } from "next/server";

export type PublicError = {
  error: string;
  requestId: string;
} & Record<string, unknown>;

/** Respuesta JSON homogénea para Route Handlers (códigos estables, sin secretos). */
export function jsonPublicError(
  requestId: string,
  status: number,
  publicCode: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: publicCode, requestId, ...extra } satisfies PublicError,
    { status, headers: { "X-Request-Id": requestId } },
  );
}
