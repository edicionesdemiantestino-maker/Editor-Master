import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";

export const runtime = "nodejs";

const BUCKET = "exports";
const LIST_PAGE_SIZE = 100;

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.INTERNAL_CRON_SECRET?.trim();
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  return auth === expected;
}

function isExpired(isoDate: string, maxAgeHours: number): boolean {
  const created = new Date(isoDate).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created > maxAgeHours * 3600 * 1000;
}

type StorageListItem = {
  name: string;
  id: string | null;
  created_at?: string;
};

async function listAllFiles(
  supabase: SupabaseClient,
  prefix = "",
  acc: { path: string; createdAt?: string }[] = [],
): Promise<{ path: string; createdAt?: string }[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: LIST_PAGE_SIZE });

  if (error) throw error;

  for (const raw of (data ?? []) as StorageListItem[]) {
    if (!raw?.name) continue;
    if (raw.id === null) {
      await listAllFiles(supabase, `${prefix}${raw.name}/`, acc);
    } else {
      acc.push({ path: `${prefix}${raw.name}`, createdAt: raw.created_at });
    }
  }

  return acc;
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized", requestId }, { status: 401 });
  }

  const maxAgeHours = Number(process.env.EXPORT_CLEANUP_MAX_AGE_HOURS ?? 24);
  const batchSize = Number(process.env.EXPORT_CLEANUP_BATCH_SIZE ?? 50);

  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    return NextResponse.json(
      { error: "invalid_max_age", requestId },
      { status: 400 },
    );
  }
  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 500) {
    return NextResponse.json(
      { error: "invalid_batch_size", requestId },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRole) {
    return jsonPublicError(requestId, 503, "supabase_not_configured");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const allFiles = await listAllFiles(supabase);
    const toDelete: string[] = [];

    for (const f of allFiles) {
      if (toDelete.length >= batchSize) break;
      if (!f.createdAt) continue;
      if (isExpired(f.createdAt, maxAgeHours)) {
        toDelete.push(f.path);
      }
    }

    if (toDelete.length === 0) {
      logStructuredLine({
        service: "api/internal/cleanup-exports",
        requestId,
        event: "cleanup_ok",
        durationMs: Date.now() - t0,
        httpStatus: 200,
        code: "deleted=0",
      });
      return NextResponse.json({ deleted: 0, requestId });
    }

    const { error: delError } = await supabase.storage.from(BUCKET).remove(toDelete);
    if (delError) {
      console.error("cleanup_delete_error", delError);
      return NextResponse.json({ error: "delete_failed", requestId }, { status: 500 });
    }

    logStructuredLine({
      service: "api/internal/cleanup-exports",
      requestId,
      event: "cleanup_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
      code: `deleted=${toDelete.length}`,
    });

    return NextResponse.json({ deleted: toDelete.length, requestId });
  } catch (err) {
    console.error("cleanup_exception", err);
    return NextResponse.json({ error: "cleanup_failed", requestId }, { status: 500 });
  }
}

