import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { queueService } from "@/services/queue/queue-service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = randomUUID();
  const { id } = await ctx.params;

  const auth = await requireServerUser();
  if (!auth.ok) {
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }

  // Opportunistic worker tick (serverless friendly).
  await queueService.tick();

  const job = await queueService.get(id);
  if (!job) {
    return jsonPublicError(requestId, 404, "job_not_found");
  }
  if (job.userId !== auth.userId) {
    logStructuredLine(
      {
        service: "api/job",
        requestId,
        userId: auth.userId,
        event: "job_forbidden",
        httpStatus: 403,
      },
      "warn",
    );
    return jsonPublicError(requestId, 403, "forbidden");
  }

  return NextResponse.json(
    {
      id: job.id,
      kind: job.kind,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      durationMs: job.durationMs,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      result: job.result,
      errorCode: job.errorCode,
      lastErrorAt: job.lastErrorAt,
      isRetrying: job.status === "pending" && job.attempts > 0,
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}

