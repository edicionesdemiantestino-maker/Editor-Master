import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import {
  createReplicateSdInpaintProvider,
  isReplicateInpaintConfigured,
} from "@/services/inpaint";
import {
  getReplicateApiToken,
  getReplicateInpaintVersion,
} from "@/services/inpaint/env";

import { INPAINT_MAX_BODY_BYTES } from "./constants";
import { validateInpaintJsonBody } from "./validate-inpaint-body";

export const maxDuration = 120;
/** image-size y Buffer requieren Node (no Edge). */
export const runtime = "nodejs";

const inpaintSlots = rateLimitService.inpaintSlots();

export async function POST(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();

  if (!isReplicateInpaintConfigured()) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "replicate_not_configured",
        httpStatus: 503,
      },
      "warn",
    );
    return jsonPublicError(requestId, 503, "inpaint_not_configured");
  }

  const contentLength = req.headers.get("content-length");
  if (!contentLength) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "missing_content_length",
        httpStatus: 400,
      },
      "warn",
    );
    return jsonPublicError(requestId, 400, "content_length_required");
  }
  const bytes = Number.parseInt(contentLength, 10);
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > INPAINT_MAX_BODY_BYTES) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "body_too_large",
        httpStatus: 413,
        code: "size_check",
      },
      "warn",
    );
    return jsonPublicError(requestId, 413, "payload_too_large");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "auth_failed",
        httpStatus: auth.status,
        code: auth.logCode ?? auth.publicCode,
      },
      "warn",
    );
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }
  const userId = auth.userId;

  const rl = await rateLimitService.consumeInpaint(userId);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "rate_limited",
        httpStatus: 429,
      },
      "warn",
    );
    return NextResponse.json(
      { error: "rate_limit", requestId, retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: {
          "Retry-After": String(retrySec),
          "X-Request-Id": requestId,
        },
      },
    );
  }

  let rawJson: string;
  try {
    rawJson = await req.text();
  } catch {
    return jsonPublicError(requestId, 400, "body_read_failed");
  }
  if (rawJson.length > INPAINT_MAX_BODY_BYTES) {
    return jsonPublicError(requestId, 413, "payload_too_large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "json_parse_error",
        httpStatus: 400,
      },
      "warn",
    );
    return jsonPublicError(requestId, 400, "invalid_json");
  }

  const validated = validateInpaintJsonBody(parsed);
  if (!validated.ok) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "validation_failed",
        httpStatus: validated.httpStatus,
        code: validated.publicCode,
      },
      "warn",
    );
    return jsonPublicError(
      requestId,
      validated.httpStatus,
      validated.publicCode,
    );
  }

  if (!(await inpaintSlots.tryAcquire(userId))) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "concurrent_limit",
        httpStatus: 429,
      },
      "warn",
    );
    return jsonPublicError(requestId, 429, "too_many_concurrent_requests");
  }

  try {
    const token = getReplicateApiToken()!;
    const version = getReplicateInpaintVersion()!;
    const provider = createReplicateSdInpaintProvider({ token, version });

    logStructuredLine({
      service: "api/inpaint",
      requestId,
      userId,
      event: "replicate_invoke_start",
    });

    const result = await provider.run({
      imageDataUrl: validated.value.imageDataUrl,
      maskDataUrl: validated.value.maskDataUrl,
      prompt: validated.value.prompt,
    });

    logStructuredLine({
      service: "api/inpaint",
      requestId,
      userId,
      event: "replicate_invoke_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
    });

    return NextResponse.json(
      {
        outputUrl: result.outputUrl,
        requestId,
      },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch (e) {
    const internal =
      e instanceof Error ? e.message.slice(0, 500) : "unknown_error";
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "replicate_invoke_error",
        durationMs: Date.now() - t0,
        httpStatus: 502,
        code: "provider_error",
      },
      "error",
    );
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        service: "api/inpaint",
        requestId,
        userId,
        event: "replicate_error_detail",
        detail: internal,
      }),
    );
    await reportServerException(
      { segment: "api/inpaint", requestId, userId },
      e,
    );
    return jsonPublicError(requestId, 502, "provider_unavailable");
  } finally {
    await inpaintSlots.release(userId);
  }
}
