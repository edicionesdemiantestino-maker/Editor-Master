import { randomUUID } from "node:crypto";

import { imageSize } from "image-size";
import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import {
  firstEnvPath,
  resolveReadableIccPath,
} from "@/lib/print/resolve-icc-path";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { buildCmykPrintPdfBuffer } from "@/services/print/print-service";

import { EXPORT_PRINT_MAX_BODY_BYTES } from "./constants";
import { rasterPxToContentPt, validateExportPrintBody } from "./validate-print-body";

export const maxDuration = 120;
export const runtime = "nodejs";

const exportPrintSlots = rateLimitService.exportPrintSlots();

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

    const v = validated.value;
    const rgbBuf = validated.rasterBuffer;
    const meta = imageSize(rgbBuf);
    if (!meta.width || !meta.height) {
      return jsonPublicError(requestId, 400, "invalid_image_binary");
    }

    const { widthPt, heightPt } = rasterPxToContentPt(
      meta.width,
      meta.height,
      v.targetDpi,
    );
    const bleedPt = mmToPt(v.bleedMm);

    const cmykIccPath = await resolveReadableIccPath(
      firstEnvPath(
        "PRINT_ICC_CMYK_OUTPUT_PATH",
        "SHARP_PRINT_OUTPUT_ICC",
      ),
    );

    logStructuredLine({
      service: "api/export-print",
      requestId,
      userId,
      event: "cmyk_pdf_build_start",
      code: `dpi=${v.targetDpi}${cmykIccPath ? ";icc=output" : ";icc=builtin"}`,
    });

    const pdfBuf = await buildCmykPrintPdfBuffer({
      rgbRaster: rgbBuf,
      contentWidthPt: widthPt,
      contentHeightPt: heightPt,
      bleedPt,
      drawCropMarks: v.drawCropMarks,
      cmykOutputIccPath: cmykIccPath,
    });

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
    const detail = e instanceof Error ? e.message.slice(0, 400) : "error";
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        userId,
        event: "cmyk_pdf_build_error",
        httpStatus: 502,
        code: "cmyk_pipeline_failed",
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
    return jsonPublicError(requestId, 502, "cmyk_export_failed");
  } finally {
    await exportPrintSlots.release(userId);
  }
}
