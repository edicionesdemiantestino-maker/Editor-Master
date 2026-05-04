const MAX_DEPTH = 14;
const MAX_STRING = 4096;

/**
 * Reduce peso del JSON de Fabric antes de persistir (data URLs enormes en imágenes).
 * No altera el modelo canónico del editor; solo el snapshot opcional `fabricSnapshot`.
 */
export function pruneFabricJsonForPersistence(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return walk(input, 0) as Record<string, unknown>;
}

function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return null;
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > MAX_STRING) {
      return `__omitted_data_url__:${value.slice(5, 40)}…`;
    }
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => walk(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "src" && typeof v === "string" && v.startsWith("data:") && v.length > MAX_STRING) {
        out[k] = `__omitted_data_url__:${v.slice(5, 40)}…`;
        continue;
      }
      out[k] = walk(v, depth + 1);
    }
    return out;
  }
  return undefined;
}
