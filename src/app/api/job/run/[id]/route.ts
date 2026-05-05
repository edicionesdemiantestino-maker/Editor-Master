import { randomUUID } from "node:crypto";

import { imageSize } from "image-size";
import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { reportServerException } from "@/lib/observability/server-reporting";
import { resolveCmykOutputIccPath } from "@/lib/print/resolve-icc-path";
import { rateLimitService } from "@/lib/rate-limit/rate-limit-service";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { timeoutSignal } from "@/lib/async/timeout";
import { USAGE_COST_USD } from "@/lib/billing/usage-costs";
import { trackUsageEvent } from "@/services/usage/usage-service";
import { checkUsageLimit } from "@/services/billing/check-usage-limit";
import { maybeReportMeteredUsage } from "@/services/billing/metered-usage-billing";
import { getReplicateApiToken, getReplicateInpaintVersion } from "@/services/inpaint/env";
import { createReplicateSdInpaintProvider } from "@/services/inpaint";
import { getInpaintCachedResult, setInpaintCachedResult } from "@/services/inpaint/inpaint-result-cache";
import { buildCmykPrintPdfBuffer } from "@/services/print/print-service";
import { releaseJobLock, tryAcquireJobLockSafe } from "@/services/queue/job-lock";
import { queueService } from "@/services/queue/queue-service";
import { validateExportPrintBody, rasterPxToContentPt } from "@/app/api/export-print/validate-print-body";

export const runtime = "nodejs";

const inpaintSlots = rateLimitService.inpaintSlots();
const exportPrintSlots = rateLimitService.exportPrintSlots();

async function maybeLogUsageWarning(args: {
  supabase: any;
  userId: string;
  kind: "inpaint" | "export-print";
  requestId: string;
}) {
  try {
    const [{ data: limitsData }, { data: usageData }] = await Promise.all([
      args.supabase.rpc("get_user_limits"),
      args.supabase.rpc("get_monthly_usage", { uid: args.userId }),
    ]);

    const planId = String(limitsData?.[0]?.plan_id ?? "free");
    const { data: planRow } = await args.supabase
      .from("billing_plans")
      .select("price_usd")
      .eq("id", planId)
      .maybeSingle();

    const limitUsd = Number(planRow?.price_usd ?? 0);
    if (!Number.isFinite(limitUsd) || limitUsd <= 0) return;

    const totalCost = (usageData ?? []).reduce(
      (acc: number, r: any) => acc + Number(r.total_cost ?? 0),
      0,
    );

    if (totalCost > limitUsd * 0.8) {
      logStructuredLine(
        {
          service: args.kind === "inpaint" ? "api/inpaint" : "api/export-print",
          requestId: args.requestId,
          userId: args.userId,
          event: "usage_warning",
          code: "near_plan_price",
        },
        "warn",
      );
    }
  } catch {
    // best effort
  }
}

function msSince(start: number | null) {
  return start ? Math.max(0, Date.now() - start) : null;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = randomUUID();
  const { id } = await ctx.params;
  const startedAt = Date.now();

  const auth = await requireServerUser();
  if (!auth.ok) {
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }

  await queueService.tick();

  const job = await queueService.get(id);
  if (!job) return jsonPublicError(requestId, 404, "job_not_found");
  if (job.userId !== auth.userId) return jsonPublicError(requestId, 403, "forbidden");

  // Guardia extra: idempotencia real + lock.
  if (job.status !== "pending") {
    return NextResponse.json(
      { ok: true, status: job.status, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  }

  const lock = await tryAcquireJobLockSafe(id);
  if (!lock.ok) {
    return NextResponse.json(
      { ok: true, status: "running", requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  }
  const token = lock.token;

  try {
    // Re-read after lock to avoid TOCTOU.
    // Lock re-check (TOCTOU)
    const locked = await queueService.get(id);
    if (!locked) return jsonPublicError(requestId, 404, "job_not_found");
    if (locked.status !== "pending") {
      return NextResponse.json(
        { ok: true, status: locked.status, requestId },
        { headers: { "X-Request-Id": requestId } },
      );
    }

    await queueService.update(id, {
      status: "running",
      updatedAt: Date.now(),
    });

    let result: unknown;

    if (locked.kind === "inpaint") {
      const input = locked.payload as {
        imageDataUrl: string;
        maskDataUrl: string;
        prompt?: string;
      };

      const cacheHit = await getInpaintCachedResult(input);
      if (cacheHit.hit) {
        result = { outputUrl: cacheHit.outputUrl, cached: true };
      } else {
        const quota = await checkUsageLimit(auth.supabase, "inpaint");
        if (!quota.allowed) throw new Error("quota_exceeded");
        if (!(await inpaintSlots.tryAcquire(auth.userId))) {
          throw new Error("too_many_concurrent_requests");
        }
        try {
          const token = getReplicateApiToken()!;
          const version = getReplicateInpaintVersion()!;
          const provider = createReplicateSdInpaintProvider({ token, version });
          const r = await Promise.race([
            provider.run(input),
            timeoutSignal({ ms: 30_000, code: "provider_timeout" }),
          ]);
          await setInpaintCachedResult({ ...input, outputUrl: r.outputUrl });
          await trackUsageEvent(
            auth.supabase,
            auth.userId,
            "inpaint",
            locked.id,
            1,
            USAGE_COST_USD.inpaint,
          );
          await maybeLogUsageWarning({
            supabase: auth.supabase,
            userId: auth.userId,
            kind: "inpaint",
            requestId,
          });
          await maybeReportMeteredUsage({
            supabase: auth.supabase,
            userId: auth.userId,
            kind: "inpaint",
          });
          result = { outputUrl: r.outputUrl };
          logStructuredLine({
            service: "api/inpaint",
            requestId,
            userId: auth.userId,
            event: "cost_event",
            code: "inpaint",
            durationMs: Date.now() - startedAt,
            httpStatus: 200,
          });
        } finally {
          await inpaintSlots.release(auth.userId);
        }
      }
    } else if (locked.kind === "export-print") {
      const validated = validateExportPrintBody(locked.payload);
      if (!validated.ok) throw new Error(validated.publicCode);

      const quota = await checkUsageLimit(auth.supabase, "export-print");
      if (!quota.allowed) throw new Error("quota_exceeded");
      if (!(await exportPrintSlots.tryAcquire(auth.userId))) {
        throw new Error("too_many_concurrent_requests");
      }
      try {
        const v = validated.value;
        const rgbBuf = validated.rasterBuffer;
        const meta = imageSize(rgbBuf);
        if (!meta.width || !meta.height) throw new Error("invalid_image_binary");

        const { widthPt, heightPt } = rasterPxToContentPt(
          meta.width,
          meta.height,
          v.targetDpi,
        );
        const bleedPt = (v.bleedMm * 72) / 25.4;
        const cmykIcc = await resolveCmykOutputIccPath();
        if (!cmykIcc.path && process.env.NODE_ENV === "production") {
          throw new Error("cmyk_icc_required");
        }

        const pdfBuf = await Promise.race([
          buildCmykPrintPdfBuffer({
            rgbRaster: rgbBuf,
            contentWidthPt: widthPt,
            contentHeightPt: heightPt,
            bleedPt,
            drawCropMarks: v.drawCropMarks,
            cmykOutputIccPath: cmykIcc.path,
          }),
          timeoutSignal({ ms: 60_000, code: "print_timeout" }),
        ]);

        const filename = `${v.title.replace(/[^\w\-]+/g, "-").slice(0, 80) || "print"}-cmyk.pdf`;
        const filePath = `${auth.userId}/${locked.id}/${filename}`;
        const bucket = auth.supabase.storage.from("exports");
        const upload = await bucket.upload(filePath, pdfBuf, {
          contentType: "application/pdf",
          upsert: true,
        });
        if (upload.error) throw new Error("storage_upload_failed");

        const signed = await bucket.createSignedUrl(filePath, 60 * 60);
        if (signed.error || !signed.data?.signedUrl) {
          throw new Error("storage_signed_url_failed");
        }

        await trackUsageEvent(
          auth.supabase,
          auth.userId,
          "export-print",
          locked.id,
          1,
          USAGE_COST_USD["export-print"],
        );
        await maybeLogUsageWarning({
          supabase: auth.supabase,
          userId: auth.userId,
          kind: "export-print",
          requestId,
        });
        await maybeReportMeteredUsage({
          supabase: auth.supabase,
          userId: auth.userId,
          kind: "export-print",
        });

        result = { downloadUrl: signed.data.signedUrl, filename, filePath };

        logStructuredLine({
          service: "api/export-print",
          requestId,
          userId: auth.userId,
          event: "cost_event",
          code: "export-print",
          durationMs: Date.now() - startedAt,
          httpStatus: 200,
          bytesOut: pdfBuf.length,
        });
      } finally {
        await exportPrintSlots.release(auth.userId);
      }
    } else {
      throw new Error("unknown_job_kind");
    }

    await queueService.update(id, {
      status: "done",
      result,
      durationMs: Date.now() - startedAt,
      updatedAt: Date.now(),
    });

    return NextResponse.json(
      { ok: true, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch (e) {
    const errorCode =
      e instanceof Error ? e.message.slice(0, 120) : "job_failed";

    const fresh = await queueService.get(id);
    const baseAttempts = fresh?.attempts ?? job.attempts;
    const maxAttempts = fresh?.maxAttempts ?? job.maxAttempts;

    console.error(
      JSON.stringify({
        event: "job_failed",
        jobId: id,
        attempts: baseAttempts,
        error: errorCode,
      }),
    );

    const nextAttempts = baseAttempts + 1;
    const shouldRetry = nextAttempts < maxAttempts;

    if (shouldRetry) {
      await queueService.update(id, {
        status: "pending",
        attempts: nextAttempts,
        lastErrorAt: Date.now(),
        updatedAt: Date.now(),
      });
      return NextResponse.json(
        { ok: false, retrying: true, requestId },
        { headers: { "X-Request-Id": requestId } },
      );
    }

    await reportServerException({ segment: "api/job/run", requestId, userId: auth.userId }, e);
    await queueService.update(id, {
      status: "error",
      errorCode,
      attempts: nextAttempts,
      durationMs: Date.now() - startedAt,
      lastErrorAt: Date.now(),
      updatedAt: Date.now(),
    });

    return NextResponse.json(
      { ok: false, error: errorCode, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  } finally {
    await releaseJobLock({ jobId: id, token });
  }
}

