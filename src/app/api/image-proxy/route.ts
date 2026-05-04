import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";

import {
  IMAGE_PROXY_MAX_RESPONSE_BYTES,
  IMAGE_PROXY_UPSTREAM_TIMEOUT_MS,
} from "./constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const imageProxySlots = rateLimitService.imageProxySlots();

/**
 * Solo dominios de entrega de Replicate (evita SSRF abierto).
 * Ajustá la lista si Replicate cambia hostnames.
 */
function isAllowedReplicateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "replicate.delivery" || h.endsWith(".replicate.delivery");
}

export async function GET(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();
  const urlParam = new URL(req.url).searchParams.get("url");
  if (!urlParam) {
    return jsonPublicError(requestId, 400, "missing_url");
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return jsonPublicError(requestId, 400, "invalid_url");
  }

  if (target.protocol !== "https:" || !isAllowedReplicateHost(target.hostname)) {
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        event: "image_proxy_host_rejected",
        httpStatus: 403,
        code: target.hostname,
      },
      "warn",
    );
    return jsonPublicError(requestId, 403, "forbidden_host");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    logStructuredLine(
      {
        service: "api/image-proxy",
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

  const rl = await rateLimitService.consumeImageProxy(userId);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        userId,
        event: "image_proxy_rate_limited",
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

  if (!(await imageProxySlots.tryAcquire(userId))) {
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        userId,
        event: "image_proxy_concurrent_limit",
        httpStatus: 429,
      },
      "warn",
    );
    return jsonPublicError(requestId, 429, "too_many_concurrent_requests");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_PROXY_UPSTREAM_TIMEOUT_MS);
  try {
    logStructuredLine({
      service: "api/image-proxy",
      requestId,
      userId,
      event: "image_proxy_start",
      code: target.hostname,
    });

    const upstream = await fetch(target.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { Accept: "image/*,*/*" },
    });
    if (!upstream.ok) {
      logStructuredLine(
        {
          service: "api/image-proxy",
          requestId,
          userId,
          event: "image_proxy_upstream_status",
          httpStatus: upstream.status,
        },
        "warn",
      );
      return jsonPublicError(requestId, 502, "upstream_fetch_failed");
    }
    const buf = new Uint8Array(await upstream.arrayBuffer());
    if (buf.byteLength > IMAGE_PROXY_MAX_RESPONSE_BYTES) {
      logStructuredLine(
        {
          service: "api/image-proxy",
          requestId,
          userId,
          event: "image_proxy_upstream_too_large",
          httpStatus: 413,
          bytesOut: buf.byteLength,
        },
        "warn",
      );
      return jsonPublicError(requestId, 413, "upstream_too_large");
    }
    const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
    logStructuredLine({
      service: "api/image-proxy",
      requestId,
      userId,
      event: "image_proxy_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
      bytesOut: buf.byteLength,
    });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=300",
        "X-Request-Id": requestId,
      },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    if (!aborted) {
      await reportServerException(
        { segment: "api/image-proxy", requestId, userId },
        e,
      );
    }
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        userId,
        event: aborted ? "image_proxy_timeout" : "image_proxy_upstream_error",
        durationMs: Date.now() - t0,
        httpStatus: 502,
        code: aborted ? "upstream_timeout" : "fetch_failed",
      },
      "warn",
    );
    return jsonPublicError(
      requestId,
      502,
      aborted ? "upstream_timeout" : "upstream_error",
    );
  } finally {
    clearTimeout(timer);
    await imageProxySlots.release(userId);
  }
}
