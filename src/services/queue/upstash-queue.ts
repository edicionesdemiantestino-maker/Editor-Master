import { randomUUID } from "node:crypto";

import type { Redis } from "@upstash/redis";

import type { JobKind, JobRecord } from "./job-types";

function now() {
  return Date.now();
}

function queueKey(kind: JobKind) {
  return `em:q:${kind}`;
}

function jobKey(jobId: string) {
  return `em:job:${jobId}`;
}

export function createUpstashQueue(redis: Redis) {
  const ttlSeconds = 24 * 60 * 60;

  async function load(jobId: string): Promise<JobRecord | null> {
    const raw = await redis.get(jobKey(jobId));
    if (!raw || typeof raw !== "object") return null;
    return raw as JobRecord;
  }

  async function save(job: JobRecord): Promise<void> {
    await redis.set(jobKey(job.id), job, { ex: ttlSeconds });
  }

  return {
    configure(_args: { maxConcurrent: number }) {
      // no-op: ejecución se maneja por /api/job/run/:id + locks.
    },

    async enqueue<TInput>(args: { kind: JobKind; userId: string; payload: TInput }): Promise<string> {
      const id = randomUUID();
      const job: JobRecord = {
        id,
        userId: args.userId,
        kind: args.kind,
        status: "pending",
        payload: args.payload,
        createdAt: now(),
        updatedAt: now(),
        attempts: 0,
        maxAttempts: 2,
      };
      await redis.set(jobKey(id), job, { ex: ttlSeconds });
      await redis.rpush(queueKey(args.kind), id);
      return id;
    },

    async get(jobId: string): Promise<JobRecord | null> {
      return await load(jobId);
    },

    async put(job: JobRecord): Promise<void> {
      await save(job);
    },

    async update(jobId: string, patch: Partial<JobRecord>): Promise<JobRecord | null> {
      const job = await load(jobId);
      if (!job) return null;
      const next = { ...job, ...patch, updatedAt: now() };
      await save(next);
      return next;
    },

    async cancel(jobId: string): Promise<boolean> {
      const job = await load(jobId);
      if (!job || job.status !== "pending") return false;
      job.status = "cancelled";
      job.updatedAt = now();
      await save(job);
      return true;
    },

    /**
     * En serverless no hay worker permanente: procesamos durante requests/polling.
     */
    async tick(): Promise<void> {
      // no-op: Redis TTL hace la limpieza.
    },
  } as const;
}

