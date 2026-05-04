import { constants } from "node:fs";
import { access } from "node:fs/promises";

/**
 * Devuelve la ruta solo si el proceso puede leerla (evita pasar paths inválidos a sharp).
 */
export async function resolveReadableIccPath(
  path: string | undefined,
): Promise<string | undefined> {
  const p = path?.trim();
  if (!p) return undefined;
  try {
    await access(p, constants.R_OK);
    return p;
  } catch {
    return undefined;
  }
}

/** Primera variable de entorno no vacía (alias legacy `SHARP_PRINT_*`). */
export function firstEnvPath(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}
