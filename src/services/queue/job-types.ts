export type JobKind = "inpaint" | "export-print";

export type JobStatus = "pending" | "running" | "done" | "error" | "cancelled";

export type JobRecord<T = unknown> = {
  id: string;
  userId: string;
  kind: JobKind;

  status: JobStatus;

  payload: unknown;
  result?: T;

  errorCode?: string;
  lastErrorAt?: number;

  createdAt: number;
  updatedAt: number;

  attempts: number;
  maxAttempts: number;

  durationMs?: number;
};

