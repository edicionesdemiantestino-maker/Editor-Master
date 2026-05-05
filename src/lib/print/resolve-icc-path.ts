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

export type PrintCmykProfile = "fogras39" | "swop" | "custom";

function normalizeProfileName(v: string | undefined): PrintCmykProfile | null {
  const t = v?.trim().toLowerCase();
  if (!t) return null;
  if (t === "fogra39" || t === "iso_coated_v2" || t === "iso-coated-v2") {
    return "fogras39";
  }
  if (t === "swop" || t === "us_web_coated_swop" || t === "us-web-coated-swop") {
    return "swop";
  }
  if (t === "custom") return "custom";
  return null;
}

/**
 * Resuelve el perfil CMYK de salida preferido:
 * - Si existe `PRINT_CMYK_PROFILE`, busca su path.
 * - Si no, cae a `PRINT_ICC_CMYK_OUTPUT_PATH` / `SHARP_PRINT_OUTPUT_ICC` (legacy).
 */
export async function resolveCmykOutputIccPath(): Promise<{
  profile: PrintCmykProfile | "legacy" | "none";
  path?: string;
}> {
  const profile = normalizeProfileName(process.env.PRINT_CMYK_PROFILE);
  if (profile) {
    const envKey =
      profile === "fogras39"
        ? "PRINT_ICC_CMYK_FOGRA39_PATH"
        : profile === "swop"
          ? "PRINT_ICC_CMYK_SWOP_PATH"
          : "PRINT_ICC_CMYK_CUSTOM_PATH";
    const resolved = await resolveReadableIccPath(process.env[envKey]);
    if (resolved) return { profile, path: resolved };
    return { profile, path: undefined };
  }

  const legacy = await resolveReadableIccPath(
    firstEnvPath("PRINT_ICC_CMYK_OUTPUT_PATH", "SHARP_PRINT_OUTPUT_ICC"),
  );
  if (legacy) return { profile: "legacy", path: legacy };
  return { profile: "none" };
}
