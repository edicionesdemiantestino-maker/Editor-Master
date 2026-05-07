import { randomUUID } from "node:crypto";

import { imageSize } from "image-size";
import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import { redactDataUrl } from "@/lib/api/data-url";
import {
  resolveCmykOutputIccPath,
} from "@/lib/print/resolve-icc-path";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { timeoutSignal } from "@/lib/async/timeout";
import { buildCmykPrintPdfBuffer } from "@/services/print/print-service";
import { queueService } from "@/services/queue/queue-service";
import { USAGE_COST_USD } from "@/lib/billing/usage-costs";
import { trackUsageEvent } from "@/services/usage/usage-service";
import { checkUsageLimit } from "@/services/billing/check-usage-limit";
import { COSTS } from "@/lib/billing/costs";
import { consumeCredits } from "@/services/billing/credits-service";

import { EXPORT_PRINT_MAX_BODY_BYTES } from "./constants";
import { rasterPxToContentPt, validateExportPrintBody } from "./validate-print-body";

export const maxDuration = 120;
export const runtime = "nodejs";

const exportPrintSlots = rateLimitService.exportPrintSlots();

function sanitizeErrorDetail(e: unknown): string {
  if (!(e instanceof Error)) return "error";
  const msg = e.message.slice(0, 400);
  if (msg.includes("data:image/")) {
    return msg.replace(/data:image\/[^,]+,[A-Za-z0-9+/=\s]+/g, (m) => redactDataUrl(m));
  }
  return msg;
}

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

/**
 * POST JSON: genera PDF CMYK de prensa (sharp → CMYK JPEG → pdfkit).
 * Perfil CMYK opcional: `PRINT_ICC_CMYK_OUTPUT_PATH` o `SHARP_PRINT_OUTPUT_ICC` (ruta absoluta legible).
 */
export async function POST(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();

  const contentLength = req.headers.get("content-length");
  if (!contentLength) {
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        event: "missing_content_length",
        httpStatus: 400,
      },
      "warn",
    );
    return jsonPublicError(requestId, 400, "content_length_required");
  }
  const bytes = Number.parseInt(contentLength, 10);
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0 ||
    bytes > EXPORT_PRINT_MAX_BODY_BYTES
  ) {
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        event: "body_too_large",
        httpStatus: 413,
        code: "size_check",
      },
      "warn",
    );
    return jsonPublicError(requestId, 413, "payload_too_large");
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        event: "unsupported_content_type",
        httpStatus: 415,
        code: ct.slice(0, 80),
      },
      "warn",
    );
    return jsonPublicError(requestId, 415, "content_type_must_be_json");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    logStructuredLine(
      {
        service: "api/export-print",
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

  const rl = await rateLimitService.consumeExportPrint(userId);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
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

  if (!(await exportPrintSlots.tryAcquire(userId))) {
    return jsonPublicError(requestId, 429, "too_many_concurrent_requests");
  }

  try {
    let rawJson: string;
    try {
      rawJson = await req.text();
    } catch {
      return jsonPublicError(requestId, 400, "body_read_failed");
    }
    if (rawJson.length > EXPORT_PRINT_MAX_BODY_BYTES) {
      return jsonPublicError(requestId, 413, "payload_too_large");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return jsonPublicError(requestId, 400, "invalid_json");
    }

    const validated = validateExportPrintBody(parsed);
    if (!validated.ok) {
      logStructuredLine(
        {
          service: "api/export-print",
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

    // Async queue (opt-in to keep compatibility)
    const url = new URL(req.url);
    const asyncMode =
      url.searchParams.get("async") === "1" ||
      (req.headers.get("prefer") ?? "").toLowerCase().includes("respond-async");
    if (asyncMode) {
      const jobId = await queueService.enqueue({
        kind: "export-print",
        userId,
        payload: parsed,
      });
      logStructuredLine({
        service: "api/export-print",
        requestId,
        userId,
        event: "job_enqueued",
        httpStatus: 202,
        code: jobId,
      });
      return NextResponse.json(
        { jobId, requestId },
        { status: 202, headers: { "X-Request-Id": requestId } },
      );
    }

    try {
      await consumeCredits(COSTS.export_print, "export-print", requestId);
    } catch (e) {
      if (e instanceof Error && e.message === "insufficient_credits") {
        return NextResponse.json(
          { error: "insufficient_credits", requestId },
          { status: 402, headers: { "X-Request-Id": requestId } },
        );
      }
      throw e;
    }

    const v = validated.value;
    const rgbBuf = validated.rasterBuffer;
    const meta = imageSize(rgbBuf);
    if (!meta.width || !meta.height) {
      return jsonPublicError(requestId, 400, "invalid_image_binary");
    }

    const quota = await checkUsageLimit(auth.supabase, "export-print");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          used: quota.used,
          limit: quota.limit,
          planId: quota.planId,
          requestId,
        },
        { status: 429, headers: { "X-Request-Id": requestId } },
      );
    }

    const { widthPt, heightPt } = rasterPxToContentPt(
      meta.width,
      meta.height,
      v.targetDpi,
    );
    const bleedPt = mmToPt(v.bleedMm);

    const cmykIcc = await resolveCmykOutputIccPath();
    const cmykIccPath = cmykIcc.path;
    if (!cmykIccPath && process.env.NODE_ENV === "production") {
      logStructuredLine(
        {
          service: "api/export-print",
          requestId,
          userId,
          event: "cmyk_icc_missing_production",
          httpStatus: 500,
          code: cmykIcc.profile,
        },
        "error",
      );
      return jsonPublicError(requestId, 500, "cmyk_icc_required");
    }

    logStructuredLine({
      service: "api/export-print",
      requestId,
      userId,
      event: "cmyk_pdf_build_start",
      code: `dpi=${v.targetDpi}${
        cmykIccPath ? `;icc=${cmykIcc.profile}` : ";icc=builtin"
      }`,
    });

    const pdfBuf = await Promise.race([
      buildCmykPrintPdfBuffer({
        rgbRaster: rgbBuf,
        contentWidthPt: widthPt,
        contentHeightPt: heightPt,
        bleedPt,
        drawCropMarks: v.drawCropMarks,
        cmykOutputIccPath: cmykIccPath,
      }),
      timeoutSignal({ ms: 60_000, code: "print_timeout" }),
    ]);

    await trackUsageEvent(
      auth.supabase,
      userId,
      "export-print",
      null,
      1,
      USAGE_COST_USD["export-print"],
    );

    const slug = v.title.replace(/[^\w\-]+/g, "-").slice(0, 80) || "print";
    const filename = `${slug}-cmyk.pdf`;

    logStructuredLine({
      service: "api/export-print",
      requestId,
      userId,
      event: "cmyk_pdf_build_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
      bytesOut: pdfBuf.length,
    });

    logStructuredLine({
      service: "api/export-print",
      requestId,
      userId,
      event: "cost_event",
      code: "export-print",
      durationMs: Date.now() - t0,
      httpStatus: 200,
      bytesOut: pdfBuf.length,
    });

    return new NextResponse(new Uint8Array(pdfBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });
  } catch (e) {
    const detail = sanitizeErrorDetail(e);
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        userId,
        event: "cmyk_pdf_build_error",
        httpStatus: 502,
        code:
          e instanceof Error && e.message === "print_timeout"
            ? "print_timeout"
            : "cmyk_pipeline_failed",
      },
      "error",
    );
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        service: "api/export-print",
        requestId,
        userId,
        event: "cmyk_pdf_error_detail",
        detail,
      }),
    );
    await reportServerException(
      { segment: "api/export-print", requestId, userId },
      e,
    );
    return jsonPublicError(
      requestId,
      e instanceof Error && e.message === "print_timeout" ? 504 : 502,
      e instanceof Error && e.message === "print_timeout"
        ? "print_timeout"
        : "cmyk_export_failed",
    );
  } finally {
    await exportPrintSlots.release(userId);
  }
}
