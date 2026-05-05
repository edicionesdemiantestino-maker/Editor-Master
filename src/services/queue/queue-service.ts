import { getUpstashRedis } from "@/lib/rate-limit/upstash-redis";

import type { JobKind, JobRecord } from "./job-types";
import { memoryQueue } from "./memory-queue";
import { createUpstashQueue } from "./upstash-queue";

type EnqueueArgs<TInput> = {
  kind: JobKind;
  userId: string;
  payload: TInput;
};

type QueueBackend = {
  enqueue: <TInput>(args: EnqueueArgs<TInput>) => string | Promise<string>;
  get: (jobId: string) => JobRecord | Promise<JobRecord | null> | null;
  put: (job: JobRecord) => void | Promise<void>;
  update: (jobId: string, patch: Partial<JobRecord>) => Promise<JobRecord | null>;
  tick: () => Promise<void>;
  cancel: (jobId: string) => boolean | Promise<boolean>;
  configure: (args: { maxConcurrent: number }) => void;
};

let backend: QueueBackend | null = null;

function getBackend(): QueueBackend {
  if (backend) return backend;
  const redis = getUpstashRedis();
  if (redis) {
    backend = createUpstashQueue(redis) as unknown as QueueBackend;
    backend.configure({ maxConcurrent: 2 });
    return backend;
  }
  backend = memoryQueue as unknown as QueueBackend;
  backend.configure({ maxConcurrent: 2 });
  return backend;
}

export const queueService = {
  async enqueue<TInput>(args: EnqueueArgs<TInput>): Promise<string> {
    const id = await getBackend().enqueue(args);
    return String(id);
  },

  async get(jobId: string): Promise<JobRecord | null> {
    const r = await (getBackend().get(jobId) as any);
    return r ?? null;
  },

  async put(job: JobRecord): Promise<void> {
    await getBackend().put(job);
  },

  async update(jobId: string, patch: Partial<JobRecord>): Promise<JobRecord | null> {
    return await getBackend().update(jobId, patch);
  },

  async cancel(jobId: string): Promise<boolean> {
    return await getBackend().cancel(jobId);
  },

  async tick(): Promise<void> {
    await getBackend().tick();
  },
} as const;

