import { randomUUID } from "node:crypto";

import { getUpstashRedis } from "@/lib/rate-limit/upstash-redis";

const memLocks = new Map<string, { token: string; expiresAt: number }>();

function now() {
  return Date.now();
}

export async function tryAcquireJobLock(args: {
  jobId: string;
  ttlMs: number;
}): Promise<{ ok: true; token: string } | { ok: false }> {
  const token = randomUUID();
  const redis = getUpstashRedis();
  if (redis) {
    const key = `em:job:lock:${args.jobId}`;
    const ok = await redis.set(key, token, {
      nx: true,
      px: Math.max(1000, Math.floor(args.ttlMs)),
    });
    // upstash returns "OK" or null
    if (ok) return { ok: true, token };
    return { ok: false };
  }

  const existing = memLocks.get(args.jobId);
  if (existing && existing.expiresAt > now()) return { ok: false };
  memLocks.set(args.jobId, { token, expiresAt: now() + args.ttlMs });
  return { ok: true, token };
}

export type JobLockResult =
  | { ok: true; token: string }
  | { ok: false };

export async function tryAcquireJobLockSafe(
  jobId: string,
): Promise<JobLockResult> {
  // TTL suficientemente grande para el job-run (timeouts ya cortan).
  return await tryAcquireJobLock({ jobId, ttlMs: 120_000 });
}

export async function releaseJobLock(args: {
  jobId: string;
  token: string;
}): Promise<void> {
  const redis = getUpstashRedis();
  if (redis) {
    const key = `em:job:lock:${args.jobId}`;
    // Best-effort: delete only if matches token
    const lua = `
local v = redis.call('GET', KEYS[1])
if v == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;
    await redis.eval(lua, [key], [args.token]);
    return;
  }

  const existing = memLocks.get(args.jobId);
  if (existing?.token === args.token) {
    memLocks.delete(args.jobId);
  }
}

