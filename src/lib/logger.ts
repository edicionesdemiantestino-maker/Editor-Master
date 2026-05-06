type LogPayload = Record<string, unknown>;

function safeSerialize(payload: unknown): unknown {
  if (payload == null) return null;
  if (typeof payload !== "object") return payload;
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return { note: "unserializable_payload" };
  }
}

export function logError(event: string, payload?: unknown) {
  const line: LogPayload = {
    event,
    payload: safeSerialize(payload),
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(line));
}

