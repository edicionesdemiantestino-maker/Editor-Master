import { randomUUID } from "node:crypto";

import type { JobKind, JobRecord } from "./job-types";

const jobs = new Map<string, JobRecord<any>>();
const TTL_MS = 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

export const memoryQueue = {
  configure(_args: { maxConcurrent: number }) {
    // no-op: ejecución se maneja por /api/job/run/:id + locks.
  },

  enqueue<TInput>(args: { kind: JobKind; userId: string; payload: TInput }): string {
    const id = randomUUID();
    const rec: JobRecord = {
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
    jobs.set(id, rec);
    return id;
  },

  get(jobId: string): JobRecord | null {
    return jobs.get(jobId) ?? null;
  },

  put(job: JobRecord): void {
    jobs.set(job.id, job);
  },

  async update(jobId: string, patch: Partial<JobRecord>): Promise<JobRecord | null> {
    const job = jobs.get(jobId);
    if (!job) return null;
    const next = { ...job, ...patch, updatedAt: now() };
    jobs.set(jobId, next);
    return next;
  },

  cancel(jobId: string): boolean {
    const job = jobs.get(jobId);
    if (!job) return false;
    if (job.status !== "pending") return false;
    job.status = "cancelled";
    job.updatedAt = now();
    return true;
  },

  async tick(): Promise<void> {
    const t = now();
    for (const [id, job] of jobs) {
      if (t - job.createdAt > TTL_MS) {
        jobs.delete(id);
      }
    }
  },
} as const;

