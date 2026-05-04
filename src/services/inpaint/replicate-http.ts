/**
 * Cliente HTTP mínimo para la API de predicciones de Replicate.
 * @see https://replicate.com/docs/reference/http
 */

const REPLICATE_API = "https://api.replicate.com/v1";

const MAX_ERROR_SNIPPET = 400;

function truncate(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= MAX_ERROR_SNIPPET ? t : `${t.slice(0, MAX_ERROR_SNIPPET)}…`;
}

export type ReplicatePrediction = {
  id: string;
  status: string;
  error?: string | null;
  output?: unknown;
  urls?: { get?: string; cancel?: string };
};

function parseJsonBody(
  text: string,
  httpStatus: number,
): ReplicatePrediction & { detail?: string } {
  try {
    return JSON.parse(text) as ReplicatePrediction & { detail?: string };
  } catch {
    throw new Error(
      truncate(`Replicate HTTP ${httpStatus}: cuerpo no es JSON válido`),
    );
  }
}

export async function replicateCreatePrediction(args: {
  token: string;
  version: string;
  input: Record<string, unknown>;
  /** `Prefer: wait=N` mantiene la conexión hasta N s si el modelo termina a tiempo. */
  preferWaitSeconds?: number;
  signal?: AbortSignal;
}): Promise<ReplicatePrediction> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${args.token}`,
    "Content-Type": "application/json",
  };
  if (typeof args.preferWaitSeconds === "number" && args.preferWaitSeconds > 0) {
    headers.Prefer = `wait=${Math.min(args.preferWaitSeconds, 300)}`;
  }

  const res = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      version: args.version,
      input: args.input,
    }),
    signal: args.signal,
  });

  const text = await res.text();
  const body = parseJsonBody(text, res.status);

  if (!res.ok) {
    const detail =
      typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
    throw new Error(truncate(`Replicate: ${detail}`));
  }

  return body;
}

export async function replicateGetPrediction(args: {
  token: string;
  predictionId: string;
  signal?: AbortSignal;
}): Promise<ReplicatePrediction> {
  const res = await fetch(`${REPLICATE_API}/predictions/${args.predictionId}`, {
    headers: { Authorization: `Bearer ${args.token}` },
    signal: args.signal,
  });
  const text = await res.text();
  const body = parseJsonBody(text, res.status);
  if (!res.ok) {
    const detail =
      typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
    throw new Error(truncate(`Replicate: ${detail}`));
  }
  return body;
}

export async function replicateWaitForOutput(args: {
  token: string;
  predictionId: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}): Promise<unknown> {
  const interval = args.pollIntervalMs ?? 1000;
  const max = args.maxAttempts ?? 180;
  for (let i = 0; i < max; i++) {
    if (args.signal?.aborted) {
      throw new Error("Replicate: operación cancelada.");
    }
    const p = await replicateGetPrediction({
      token: args.token,
      predictionId: args.predictionId,
      signal: args.signal,
    });
    if (p.status === "succeeded") return p.output;
    if (p.status === "failed" || p.status === "canceled") {
      const err = p.error ? truncate(String(p.error)) : `Predicción ${p.status}`;
      throw new Error(err);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Timeout esperando la predicción en Replicate.");
}
