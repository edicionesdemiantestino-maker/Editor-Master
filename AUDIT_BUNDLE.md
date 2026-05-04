# Editor Maestro - bundle de codigo para auditoria

Generado por: scripts/export-audit-bundle.ps1
Raiz del repo: D:\Editor Maestro

## Prompt sugerido para el auditor

Sos un revisor senior de seguridad, arquitectura, performance y calidad de codigo (TypeScript/React/Next.js App Router).
Auditoria exhaustiva del repositorio adjunto en los bloques FILE:

1. Seguridad: secretos, RLS/Supabase, rutas API (/api/inpaint, /api/image-proxy, /api/export-print), CORS, validacion de input, XSS, CSRF, rate limits, abuso de costos (Replicate/sharp).
2. Arquitectura: capas (entities / features / services / app), acoplamiento, binarios sharp/pdfkit solo en servidor.
3. Correctness: Fabric y Zustand, exportacion (RGB/pdf-lib, CMYK/sharp+pdfkit, workers), inpainting/Replicate.
4. Performance: hilo principal, renders Fabric, imagenes grandes, memoria en export.
5. DX/Prod: tests (Vitest/Playwright), lint, observabilidad (logs estructurados), CI y despliegue (sharp nativo).

Priorizacion: P0/P1/P2 con acciones concretas y referencias FILE: ruta.
Responde en espanol con tablas donde ayude.

---
## FILE: package.json

```
{
  "name": "editor-maestro",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.105.3",
    "fabric": "^7.3.1",
    "image-size": "^2.0.2",
    "next": "16.2.4",
    "pdf-lib": "^1.17.1",
    "pdfkit": "^0.18.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "sharp": "^0.34.5",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pdfkit": "^0.17.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.5"
  }
}
```

---
## FILE: tsconfig.json

```
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

---
## FILE: next.config.ts

```
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Playwright y herramientas que abren `127.0.0.1` necesitan esto en dev (Next 16+). */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /** Binarios nativos (sharp) y pdfkit no deben empaquetarse en el grafo del cliente. */
  serverExternalPackages: ["sharp", "pdfkit"],
};

export default nextConfig;
```

---
## FILE: eslint.config.mjs

```
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

---
## FILE: postcss.config.mjs

```
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

---
## FILE: .env.example

```
# Supabase (https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Opcional: clave publishable nueva en lugar de anon
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# URL pública de la app (confirmación de email / OAuth)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Replicate — borrador mágico (inpainting). Token en el panel de Replicate.
# REPLICATE_INPAINT_VERSION = id de versión del modelo (no el slug owner/name).
REPLICATE_API_TOKEN=
REPLICATE_INPAINT_VERSION=
```

---
## FILE: src\app\actions\auth.ts

```
"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logStructuredLine } from "@/lib/observability/structured-log";
import {
  isPlausibleEmail,
  isPlausiblePassword,
  parseAuthForm,
  safeAuthRedirectSnippet,
} from "@/lib/auth/form-validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  signInWithEmailPassword,
  signOut,
  signUpWithEmailPassword,
} from "@/services/auth/auth-service";

/** Evita propagar mensajes de error internos en query params. */
function redirectAuthError(path: string, rawMessage: string): never {
  const m = safeAuthRedirectSnippet(rawMessage, 200);
  const sanitized =
    /internal|database|postgres|sql|500|timeout|econn/i.test(m) ||
    m.length > 180
      ? "Error del servidor. Intentá más tarde."
      : m;
  redirect(`${path}?error=${encodeURIComponent(sanitized)}`);
}

export async function signInAction(formData: FormData) {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_in_supabase_missing",
        httpStatus: 503,
      },
      "warn",
    );
    redirect(
      `/login?error=${encodeURIComponent("Supabase no está configurado en el servidor.")}`,
    );
  }

  const { email, password } = parseAuthForm(formData);
  if (!isPlausibleEmail(email) || !isPlausiblePassword(password)) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_in_validation_failed",
        httpStatus: 400,
        code: "invalid_form",
      },
      "warn",
    );
    redirect(
      `/login?error=${encodeURIComponent("Revisá el email y la contraseña (mín. 6 caracteres).")}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await signInWithEmailPassword(supabase, email, password);
  if (error) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_in_failed",
        httpStatus: 401,
        code: "supabase_sign_in_error",
      },
      "warn",
    );
    redirectAuthError("/login", error.message);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_up_supabase_missing",
        httpStatus: 503,
      },
      "warn",
    );
    redirect(
      `/register?error=${encodeURIComponent("Supabase no está configurado en el servidor.")}`,
    );
  }

  const { email, password } = parseAuthForm(formData);
  if (!isPlausibleEmail(email) || !isPlausiblePassword(password)) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_up_validation_failed",
        httpStatus: 400,
        code: "invalid_form",
      },
      "warn",
    );
    redirect(
      `/register?error=${encodeURIComponent("Email o contraseña no válidos (mín. 6 caracteres).")}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await signUpWithEmailPassword(supabase, email, password);
  if (error) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_up_failed",
        httpStatus: 400,
        code: "supabase_sign_up_error",
      },
      "warn",
    );
    redirectAuthError("/register", error.message);
  }
  redirect("/login?message=confirm-email");
}

export async function signOutAction() {
  const requestId = randomUUID();
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  try {
    const supabase = await createServerSupabaseClient();
    await signOut(supabase);
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_out_ok",
        httpStatus: 200,
      },
      "info",
    );
  } catch (e) {
    logStructuredLine(
      {
        service: "actions/auth",
        requestId,
        event: "sign_out_error",
        httpStatus: 500,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
  }
  revalidatePath("/", "layout");
  redirect("/");
}
```

---
## FILE: src\app\actions\projects.ts

```
"use server";

import { randomUUID } from "node:crypto";

import { safePublicErrorMessage } from "@/lib/api/safe-public-message";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { createSlidingWindowLimiter } from "@/lib/rate-limit/memory-sliding-window";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { createProject } from "@/services/projects/projects-service";

const createProjectRate = createSlidingWindowLimiter({
  maxRequests: 15,
  windowMs: 60_000,
});

export async function createProjectAction(): Promise<
  { ok: true; id: string; requestId: string } | { ok: false; message: string }
> {
  const requestId = randomUUID();

  try {
    const auth = await requireServerUser();
    if (!auth.ok) {
      logStructuredLine(
        {
          service: "actions/projects",
          requestId,
          event: "create_project_auth_failed",
          httpStatus: auth.status,
          code: auth.logCode ?? auth.publicCode,
        },
        "warn",
      );
      if (auth.status === 503) {
        return {
          ok: false,
          message:
            auth.publicCode === "auth_backend_unavailable"
              ? "Supabase no está configurado."
              : "Servicio de autenticación no disponible.",
        };
      }
      return { ok: false, message: "Tenés que iniciar sesión." };
    }

    const rl = createProjectRate(`createProject:${auth.userId}`);
    if (!rl.allowed) {
      logStructuredLine(
        {
          service: "actions/projects",
          requestId,
          userId: auth.userId,
          event: "create_project_rate_limited",
          httpStatus: 429,
        },
        "warn",
      );
      return {
        ok: false,
        message:
          "Creaste demasiados proyectos en poco tiempo. Probá de nuevo en un minuto.",
      };
    }

    const id = await createProject(auth.supabase, auth.userId);
    logStructuredLine(
      {
        service: "actions/projects",
        requestId,
        userId: auth.userId,
        event: "create_project_ok",
        httpStatus: 200,
      },
      "info",
    );
    return { ok: true, id, requestId };
  } catch (e) {
    logStructuredLine(
      {
        service: "actions/projects",
        requestId,
        event: "create_project_error",
        httpStatus: 500,
        code: e instanceof Error ? e.name : "unknown",
      },
      "error",
    );
    return {
      ok: false,
      message: safePublicErrorMessage(e, "No se pudo crear el proyecto."),
    };
  }
}
```

---
## FILE: src\app\api\export-print\constants.ts

```
/** JSON + imagen base64 — límite conservador para memoria en serverless. */
export const EXPORT_PRINT_MAX_BODY_BYTES = 28 * 1024 * 1024;

/** Tras decodificar, borde máximo permitido (px). */
export const EXPORT_PRINT_MAX_EDGE_PX = 8192;

export const EXPORT_PRINT_RATE_LIMIT_MAX = 6;
export const EXPORT_PRINT_RATE_LIMIT_WINDOW_MS = 60_000;

export const EXPORT_PRINT_MAX_CONCURRENT_PER_USER = 1;

export const EXPORT_PRINT_TARGET_DPI_MIN = 72;
export const EXPORT_PRINT_TARGET_DPI_MAX = 600;
```

---
## FILE: src\app\api\export-print\route.ts

```
import { randomUUID } from "node:crypto";

import { imageSize } from "image-size";
import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { createInflightLimiter } from "@/lib/rate-limit/inflight-user-limiter";
import { createSlidingWindowLimiter } from "@/lib/rate-limit/memory-sliding-window";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { buildCmykPrintPdfBuffer } from "@/services/print/print-service";

import {
  EXPORT_PRINT_MAX_BODY_BYTES,
  EXPORT_PRINT_MAX_CONCURRENT_PER_USER,
  EXPORT_PRINT_RATE_LIMIT_MAX,
  EXPORT_PRINT_RATE_LIMIT_WINDOW_MS,
} from "./constants";
import { rasterPxToContentPt, validateExportPrintBody } from "./validate-print-body";

export const maxDuration = 120;
export const runtime = "nodejs";

const rateLimit = createSlidingWindowLimiter({
  maxRequests: EXPORT_PRINT_RATE_LIMIT_MAX,
  windowMs: EXPORT_PRINT_RATE_LIMIT_WINDOW_MS,
});

const inflight = createInflightLimiter(EXPORT_PRINT_MAX_CONCURRENT_PER_USER);

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

/**
 * POST JSON: genera PDF CMYK de prensa (sharp → CMYK JPEG → pdfkit).
 *
 * Variables de entorno sugeridas (no obligatorias; implementación ICC pendiente):
 * - `SHARP_PRINT_INPUT_ICC` — ruta a perfil ICC de entrada (soft proof / conversión).
 * - `SHARP_PRINT_OUTPUT_ICC` — perfil de destino CMYK (coated / uncoated).
 * Aplicar en `cmyk-pdf-from-raster.ts` con `sharp().withMetadata()` / `.profile()` según docs sharp.
 */
export async function POST(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();

  const contentLength = req.headers.get("content-length");
  if (!contentLength) {
    return jsonPublicError(requestId, 400, "content_length_required");
  }
  const bytes = Number.parseInt(contentLength, 10);
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0 ||
    bytes > EXPORT_PRINT_MAX_BODY_BYTES
  ) {
    return jsonPublicError(requestId, 413, "payload_too_large");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        event: "auth_failed",
        httpStatus: auth.status,
        code: auth.logCode ?? auth.publicCode,
      },
      "warn",
    );
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }
  const userId = auth.userId;

  const rl = rateLimit(`export-print:${userId}`);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    return NextResponse.json(
      { error: "rate_limit", requestId, retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(retrySec) },
      },
    );
  }

  if (!inflight.tryAcquire(userId)) {
    return jsonPublicError(requestId, 429, "too_many_concurrent_requests");
  }

  try {
    let rawJson: string;
    try {
      rawJson = await req.text();
    } catch {
      return jsonPublicError(requestId, 400, "body_read_failed");
    }
    if (rawJson.length > EXPORT_PRINT_MAX_BODY_BYTES) {
      return jsonPublicError(requestId, 413, "payload_too_large");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return jsonPublicError(requestId, 400, "invalid_json");
    }

    const validated = validateExportPrintBody(parsed);
    if (!validated.ok) {
      logStructuredLine(
        {
          service: "api/export-print",
          requestId,
          userId,
          event: "validation_failed",
          httpStatus: validated.httpStatus,
          code: validated.publicCode,
        },
        "warn",
      );
      return jsonPublicError(
        requestId,
        validated.httpStatus,
        validated.publicCode,
      );
    }

    const v = validated.value;
    const rgbBuf = validated.rasterBuffer;
    const meta = imageSize(rgbBuf);
    if (!meta.width || !meta.height) {
      return jsonPublicError(requestId, 400, "invalid_image_binary");
    }

    const { widthPt, heightPt } = rasterPxToContentPt(
      meta.width,
      meta.height,
      v.targetDpi,
    );
    const bleedPt = mmToPt(v.bleedMm);

    logStructuredLine({
      service: "api/export-print",
      requestId,
      userId,
      event: "cmyk_pdf_build_start",
      code: `dpi=${v.targetDpi}`,
    });

    const pdfBuf = await buildCmykPrintPdfBuffer({
      rgbRaster: rgbBuf,
      contentWidthPt: widthPt,
      contentHeightPt: heightPt,
      bleedPt,
      drawCropMarks: v.drawCropMarks,
    });

    const slug = v.title.replace(/[^\w\-]+/g, "-").slice(0, 80) || "print";
    const filename = `${slug}-cmyk.pdf`;

    logStructuredLine({
      service: "api/export-print",
      requestId,
      userId,
      event: "cmyk_pdf_build_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
      bytesOut: pdfBuf.length,
    });

    return new NextResponse(new Uint8Array(pdfBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 400) : "error";
    logStructuredLine(
      {
        service: "api/export-print",
        requestId,
        userId,
        event: "cmyk_pdf_build_error",
        httpStatus: 502,
        code: "cmyk_pipeline_failed",
      },
      "error",
    );
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        service: "api/export-print",
        requestId,
        userId,
        event: "cmyk_pdf_error_detail",
        detail,
      }),
    );
    return jsonPublicError(requestId, 502, "cmyk_export_failed");
  } finally {
    inflight.release(userId);
  }
}
```

---
## FILE: src\app\api\export-print\validate-print-body.ts

```
import { imageSize } from "image-size";

import {
  EXPORT_PRINT_MAX_EDGE_PX,
  EXPORT_PRINT_TARGET_DPI_MAX,
  EXPORT_PRINT_TARGET_DPI_MIN,
} from "./constants";

export type ExportPrintValidated = {
  imageDataUrl: string;
  bleedMm: number;
  title: string;
  drawCropMarks: boolean;
  targetDpi: number;
};

export type ExportPrintValidationFailure = {
  ok: false;
  httpStatus: number;
  publicCode: string;
};

export type ExportPrintValidationResult =
  | { ok: true; value: ExportPrintValidated; rasterBuffer: Buffer }
  | ExportPrintValidationFailure;

const ALLOWED_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
] as const;

function isAllowedDataUrl(v: unknown): v is string {
  return (
    typeof v === "string" &&
    ALLOWED_PREFIXES.some((p) => v.startsWith(p)) &&
    v.length > 80
  );
}

function decodeBase64FromDataUrl(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("invalid_data_url");
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!b64) throw new Error("empty_payload");
  return Buffer.from(b64, "base64");
}

export function validateExportPrintBody(body: unknown): ExportPrintValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, httpStatus: 400, publicCode: "invalid_json_shape" };
  }
  const o = body as Record<string, unknown>;
  if (!isAllowedDataUrl(o.imageDataUrl)) {
    return { ok: false, httpStatus: 400, publicCode: "invalid_image_data_url" };
  }
  const bleedMm = Number(o.bleedMm);
  if (!Number.isFinite(bleedMm) || bleedMm < 0 || bleedMm > 20) {
    return { ok: false, httpStatus: 400, publicCode: "invalid_bleed_mm" };
  }
  const title =
    typeof o.title === "string" ? o.title.replace(/\u0000/g, "").trim().slice(0, 200) : "";
  const drawCropMarks = o.drawCropMarks === true;
  let targetDpi = Number(o.targetDpi ?? 300);
  if (!Number.isFinite(targetDpi)) targetDpi = 300;
  targetDpi = Math.round(
    Math.min(
      EXPORT_PRINT_TARGET_DPI_MAX,
      Math.max(EXPORT_PRINT_TARGET_DPI_MIN, targetDpi),
    ),
  );

  let rasterBuffer: Buffer;
  try {
    rasterBuffer = decodeBase64FromDataUrl(o.imageDataUrl);
    const dim = imageSize(rasterBuffer);
    if (!dim.width || !dim.height) {
      return { ok: false, httpStatus: 400, publicCode: "invalid_image_binary" };
    }
    if (dim.width > EXPORT_PRINT_MAX_EDGE_PX || dim.height > EXPORT_PRINT_MAX_EDGE_PX) {
      return { ok: false, httpStatus: 400, publicCode: "dimensions_exceed_limit" };
    }
    const mp = dim.width * dim.height;
    if (mp > 120_000_000) {
      return { ok: false, httpStatus: 400, publicCode: "raster_too_many_pixels" };
    }
  } catch {
    return { ok: false, httpStatus: 400, publicCode: "invalid_image_binary" };
  }

  return {
    ok: true,
    rasterBuffer,
    value: {
      imageDataUrl: o.imageDataUrl,
      bleedMm,
      title: title.length > 0 ? title : "export-print",
      drawCropMarks,
      targetDpi,
    },
  };
}

export function rasterPxToContentPt(
  pxW: number,
  pxH: number,
  dpi: number,
): { widthPt: number; heightPt: number } {
  return {
    widthPt: (pxW * 72) / dpi,
    heightPt: (pxH * 72) / dpi,
  };
}
```

---
## FILE: src\app\api\image-proxy\constants.ts

```
/** Respuesta máxima del upstream (bytes) — memoria acotada por request. */
export const IMAGE_PROXY_MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

/** Timeout de fetch al CDN de Replicate (ms). */
export const IMAGE_PROXY_UPSTREAM_TIMEOUT_MS = 45_000;

/**
 * Rate limit por usuario (GET de imagen).
 * Más laxo que inpaint: solo descarga binaria acotada.
 */
export const IMAGE_PROXY_RATE_LIMIT_MAX = 40;
export const IMAGE_PROXY_RATE_LIMIT_WINDOW_MS = 60_000;

/** Evita ráfagas de descargas paralelas por sesión. */
export const IMAGE_PROXY_MAX_CONCURRENT_PER_USER = 4;
```

---
## FILE: src\app\api\image-proxy\route.ts

```
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { createInflightLimiter } from "@/lib/rate-limit/inflight-user-limiter";
import { createSlidingWindowLimiter } from "@/lib/rate-limit/memory-sliding-window";
import { requireServerUser } from "@/lib/supabase/require-server-user";

import {
  IMAGE_PROXY_MAX_CONCURRENT_PER_USER,
  IMAGE_PROXY_MAX_RESPONSE_BYTES,
  IMAGE_PROXY_RATE_LIMIT_MAX,
  IMAGE_PROXY_RATE_LIMIT_WINDOW_MS,
  IMAGE_PROXY_UPSTREAM_TIMEOUT_MS,
} from "./constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const rateLimit = createSlidingWindowLimiter({
  maxRequests: IMAGE_PROXY_RATE_LIMIT_MAX,
  windowMs: IMAGE_PROXY_RATE_LIMIT_WINDOW_MS,
});

const inflight = createInflightLimiter(IMAGE_PROXY_MAX_CONCURRENT_PER_USER);

/**
 * Solo dominios de entrega de Replicate (evita SSRF abierto).
 * Ajustá la lista si Replicate cambia hostnames.
 */
function isAllowedReplicateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "replicate.delivery" || h.endsWith(".replicate.delivery");
}

export async function GET(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();
  const urlParam = new URL(req.url).searchParams.get("url");
  if (!urlParam) {
    return jsonPublicError(requestId, 400, "missing_url");
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return jsonPublicError(requestId, 400, "invalid_url");
  }

  if (target.protocol !== "https:" || !isAllowedReplicateHost(target.hostname)) {
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        event: "image_proxy_host_rejected",
        httpStatus: 403,
        code: target.hostname,
      },
      "warn",
    );
    return jsonPublicError(requestId, 403, "forbidden_host");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        event: "auth_failed",
        httpStatus: auth.status,
        code: auth.logCode ?? auth.publicCode,
      },
      "warn",
    );
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }
  const userId = auth.userId;

  const rl = rateLimit(`image-proxy:${userId}`);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        userId,
        event: "image_proxy_rate_limited",
        httpStatus: 429,
      },
      "warn",
    );
    return NextResponse.json(
      { error: "rate_limit", requestId, retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(retrySec) },
      },
    );
  }

  if (!inflight.tryAcquire(userId)) {
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        userId,
        event: "image_proxy_concurrent_limit",
        httpStatus: 429,
      },
      "warn",
    );
    return jsonPublicError(requestId, 429, "too_many_concurrent_requests");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_PROXY_UPSTREAM_TIMEOUT_MS);
  try {
    logStructuredLine({
      service: "api/image-proxy",
      requestId,
      userId,
      event: "image_proxy_start",
      code: target.hostname,
    });

    const upstream = await fetch(target.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { Accept: "image/*,*/*" },
    });
    if (!upstream.ok) {
      logStructuredLine(
        {
          service: "api/image-proxy",
          requestId,
          userId,
          event: "image_proxy_upstream_status",
          httpStatus: upstream.status,
        },
        "warn",
      );
      return jsonPublicError(requestId, 502, "upstream_fetch_failed");
    }
    const buf = new Uint8Array(await upstream.arrayBuffer());
    if (buf.byteLength > IMAGE_PROXY_MAX_RESPONSE_BYTES) {
      logStructuredLine(
        {
          service: "api/image-proxy",
          requestId,
          userId,
          event: "image_proxy_upstream_too_large",
          httpStatus: 413,
          bytesOut: buf.byteLength,
        },
        "warn",
      );
      return jsonPublicError(requestId, 413, "upstream_too_large");
    }
    const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
    logStructuredLine({
      service: "api/image-proxy",
      requestId,
      userId,
      event: "image_proxy_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
      bytesOut: buf.byteLength,
    });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=300",
        "X-Request-Id": requestId,
      },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    logStructuredLine(
      {
        service: "api/image-proxy",
        requestId,
        userId,
        event: aborted ? "image_proxy_timeout" : "image_proxy_upstream_error",
        durationMs: Date.now() - t0,
        httpStatus: 502,
        code: aborted ? "upstream_timeout" : "fetch_failed",
      },
      "warn",
    );
    return jsonPublicError(
      requestId,
      502,
      aborted ? "upstream_timeout" : "upstream_error",
    );
  } finally {
    clearTimeout(timer);
    inflight.release(userId);
  }
}
```

---
## FILE: src\app\api\inpaint\constants.ts

```
/** Tamaño máximo del cuerpo JSON (bytes) — protege memoria y ancho de banda. */
export const INPAINT_MAX_BODY_BYTES = 5 * 1024 * 1024;

/** Borde máximo permitido (px) de imagen y máscara tras decodificar. */
export const INPAINT_MAX_EDGE_PX = 2048;

/** Máximo de caracteres en el prompt opcional. */
export const INPAINT_MAX_PROMPT_LENGTH = 2000;

/** Rate limit: máximo de predicciones por ventana por usuario. */
export const INPAINT_RATE_LIMIT_MAX = 8;
export const INPAINT_RATE_LIMIT_WINDOW_MS = 60_000;

/** Máximo de inpaints concurrentes por usuario. */
export const INPAINT_MAX_CONCURRENT_PER_USER = 1;
```

---
## FILE: src\app\api\inpaint\route.ts

```
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonPublicError } from "@/lib/api/http-json";
import { logStructuredLine } from "@/lib/observability/structured-log";
import { createInflightLimiter } from "@/lib/rate-limit/inflight-user-limiter";
import { createSlidingWindowLimiter } from "@/lib/rate-limit/memory-sliding-window";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import {
  createReplicateSdInpaintProvider,
  isReplicateInpaintConfigured,
} from "@/services/inpaint";
import {
  getReplicateApiToken,
  getReplicateInpaintVersion,
} from "@/services/inpaint/env";

import {
  INPAINT_MAX_BODY_BYTES,
  INPAINT_MAX_CONCURRENT_PER_USER,
  INPAINT_RATE_LIMIT_MAX,
  INPAINT_RATE_LIMIT_WINDOW_MS,
} from "./constants";
import { validateInpaintJsonBody } from "./validate-inpaint-body";

export const maxDuration = 120;
/** image-size y Buffer requieren Node (no Edge). */
export const runtime = "nodejs";

const rateLimit = createSlidingWindowLimiter({
  maxRequests: INPAINT_RATE_LIMIT_MAX,
  windowMs: INPAINT_RATE_LIMIT_WINDOW_MS,
});

const inflight = createInflightLimiter(INPAINT_MAX_CONCURRENT_PER_USER);

export async function POST(req: Request) {
  const requestId = randomUUID();
  const t0 = Date.now();

  if (!isReplicateInpaintConfigured()) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "replicate_not_configured",
        httpStatus: 503,
      },
      "warn",
    );
    return jsonPublicError(requestId, 503, "inpaint_not_configured");
  }

  const contentLength = req.headers.get("content-length");
  if (!contentLength) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "missing_content_length",
        httpStatus: 400,
      },
      "warn",
    );
    return jsonPublicError(requestId, 400, "content_length_required");
  }
  const bytes = Number.parseInt(contentLength, 10);
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > INPAINT_MAX_BODY_BYTES) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "body_too_large",
        httpStatus: 413,
        code: "size_check",
      },
      "warn",
    );
    return jsonPublicError(requestId, 413, "payload_too_large");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        event: "auth_failed",
        httpStatus: auth.status,
        code: auth.logCode ?? auth.publicCode,
      },
      "warn",
    );
    return jsonPublicError(requestId, auth.status, auth.publicCode);
  }
  const userId = auth.userId;

  const rlKey = `inpaint:${userId}`;
  const rl = rateLimit(rlKey);
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "rate_limited",
        httpStatus: 429,
      },
      "warn",
    );
    return NextResponse.json(
      { error: "rate_limit", requestId, retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(retrySec) },
      },
    );
  }

  let rawJson: string;
  try {
    rawJson = await req.text();
  } catch {
    return jsonPublicError(requestId, 400, "body_read_failed");
  }
  if (rawJson.length > INPAINT_MAX_BODY_BYTES) {
    return jsonPublicError(requestId, 413, "payload_too_large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "json_parse_error",
        httpStatus: 400,
      },
      "warn",
    );
    return jsonPublicError(requestId, 400, "invalid_json");
  }

  const validated = validateInpaintJsonBody(parsed);
  if (!validated.ok) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "validation_failed",
        httpStatus: validated.httpStatus,
        code: validated.publicCode,
      },
      "warn",
    );
    return jsonPublicError(
      requestId,
      validated.httpStatus,
      validated.publicCode,
    );
  }

  if (!inflight.tryAcquire(userId)) {
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "concurrent_limit",
        httpStatus: 429,
      },
      "warn",
    );
    return jsonPublicError(requestId, 429, "too_many_concurrent_requests");
  }

  try {
    const token = getReplicateApiToken()!;
    const version = getReplicateInpaintVersion()!;
    const provider = createReplicateSdInpaintProvider({ token, version });

    logStructuredLine({
      service: "api/inpaint",
      requestId,
      userId,
      event: "replicate_invoke_start",
    });

    const result = await provider.run({
      imageDataUrl: validated.value.imageDataUrl,
      maskDataUrl: validated.value.maskDataUrl,
      prompt: validated.value.prompt,
    });

    logStructuredLine({
      service: "api/inpaint",
      requestId,
      userId,
      event: "replicate_invoke_ok",
      durationMs: Date.now() - t0,
      httpStatus: 200,
    });

    return NextResponse.json({
      outputUrl: result.outputUrl,
      requestId,
    });
  } catch (e) {
    const internal =
      e instanceof Error ? e.message.slice(0, 500) : "unknown_error";
    logStructuredLine(
      {
        service: "api/inpaint",
        requestId,
        userId,
        event: "replicate_invoke_error",
        durationMs: Date.now() - t0,
        httpStatus: 502,
        code: "provider_error",
      },
      "error",
    );
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        service: "api/inpaint",
        requestId,
        userId,
        event: "replicate_error_detail",
        detail: internal,
      }),
    );
    return jsonPublicError(requestId, 502, "provider_unavailable");
  } finally {
    inflight.release(userId);
  }
}
```

---
## FILE: src\app\api\inpaint\validate-inpaint-body.ts

```
import { imageSize } from "image-size";

import {
  INPAINT_MAX_EDGE_PX,
  INPAINT_MAX_PROMPT_LENGTH,
} from "./constants";

export type InpaintValidatedPayload = {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
};

export type InpaintValidationFailure = {
  ok: false;
  httpStatus: number;
  /** Código estable para el cliente (no detalles internos). */
  publicCode: string;
};

export type InpaintValidationResult =
  | { ok: true; value: InpaintValidatedPayload }
  | InpaintValidationFailure;

const ALLOWED_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
] as const;

export function isAllowedImageDataUrl(v: unknown): v is string {
  return (
    typeof v === "string" &&
    ALLOWED_PREFIXES.some((p) => v.startsWith(p)) &&
    v.length > 40
  );
}

function decodeBase64FromDataUrl(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("invalid_data_url");
  }
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!b64) throw new Error("empty_payload");
  return Buffer.from(b64, "base64");
}

function measureImage(buffer: Buffer): { width: number; height: number } {
  try {
    const r = imageSize(buffer);
    if (!r.width || !r.height) throw new Error("unknown_dimensions");
    return { width: r.width, height: r.height };
  } catch {
    throw new Error("invalid_image");
  }
}

function assertMaxEdge(w: number, h: number): void {
  if (w > INPAINT_MAX_EDGE_PX || h > INPAINT_MAX_EDGE_PX) {
    throw new Error("dimensions_too_large");
  }
  if (w < 8 || h < 8) {
    throw new Error("dimensions_too_small");
  }
}

function normalizePrompt(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") throw new Error("invalid_prompt_type");
  const t = raw.replace(/\u0000/g, "").trim();
  if (t.length === 0) return undefined;
  if (t.length > INPAINT_MAX_PROMPT_LENGTH) throw new Error("prompt_too_long");
  return t;
}

/**
 * Valida estructura, decodifica buffers y comprueba dimensiones y coincidencia imagen/máscara.
 */
export function validateInpaintJsonBody(body: unknown): InpaintValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, httpStatus: 400, publicCode: "invalid_json_shape" };
  }
  const o = body as Record<string, unknown>;
  const imageDataUrl = o.imageDataUrl;
  const maskDataUrl = o.maskDataUrl;

  if (!isAllowedImageDataUrl(imageDataUrl) || !isAllowedImageDataUrl(maskDataUrl)) {
    return {
      ok: false,
      httpStatus: 400,
      publicCode: "invalid_image_data_url",
    };
  }

  try {
    const imgBuf = decodeBase64FromDataUrl(imageDataUrl);
    const maskBuf = decodeBase64FromDataUrl(maskDataUrl);
    const imgDim = measureImage(imgBuf);
    const maskDim = measureImage(maskBuf);
    assertMaxEdge(imgDim.width, imgDim.height);
    assertMaxEdge(maskDim.width, maskDim.height);
    if (imgDim.width !== maskDim.width || imgDim.height !== maskDim.height) {
      return {
        ok: false,
        httpStatus: 400,
        publicCode: "image_mask_dimension_mismatch",
      };
    }
    const prompt = normalizePrompt(o.prompt);
    return {
      ok: true,
      value: { imageDataUrl, maskDataUrl, prompt },
    };
  } catch (e) {
    const code =
      e instanceof Error ? e.message : "validation_failed";
    const map: Record<string, { status: number; public: string }> = {
      invalid_image: { status: 400, public: "invalid_image_binary" },
      invalid_data_url: { status: 400, public: "invalid_image_data_url" },
      empty_payload: { status: 400, public: "empty_image_payload" },
      unknown_dimensions: { status: 400, public: "invalid_image_binary" },
      dimensions_too_large: { status: 400, public: "dimensions_exceed_limit" },
      dimensions_too_small: { status: 400, public: "dimensions_below_minimum" },
      invalid_prompt_type: { status: 400, public: "invalid_prompt" },
      prompt_too_long: { status: 400, public: "prompt_too_long" },
    };
    const m = map[code] ?? { status: 400, public: "validation_failed" };
    return { ok: false, httpStatus: m.status, publicCode: m.public };
  }
}
```

---
## FILE: src\app\auth\callback\route.ts

```
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logStructuredLine } from "@/lib/observability/structured-log";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestId = randomUUID();
  const url = new URL(request.url);
  const { searchParams, origin } = url;

  if (!isSupabaseConfigured()) {
    logStructuredLine(
      {
        service: "route/auth-callback",
        requestId,
        event: "supabase_not_configured",
        httpStatus: 503,
      },
      "warn",
    );
    return NextResponse.redirect(new URL("/", request.url));
  }

  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logStructuredLine(
        {
          service: "route/auth-callback",
          requestId,
          event: "exchange_code_ok",
          httpStatus: 302,
        },
        "info",
      );
      return NextResponse.redirect(`${origin}${next}`);
    }
    logStructuredLine(
      {
        service: "route/auth-callback",
        requestId,
        event: "exchange_code_failed",
        httpStatus: 401,
        code: "session_exchange_error",
      },
      "warn",
    );
  } else {
    logStructuredLine(
      {
        service: "route/auth-callback",
        requestId,
        event: "missing_oauth_code",
        httpStatus: 400,
      },
      "warn",
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

---
## FILE: src\app\editor\[projectId]\editor-page-client.tsx

```
"use client";

import dynamic from "next/dynamic";

const EditorShell = dynamic(
  () =>
    import("@/features/editor/editor-shell").then((m) => ({
      default: m.EditorShell,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-zinc-500">Cargando editor…</p>
    ),
  },
);

export function EditorPageClient({ projectId }: { projectId: string }) {
  return <EditorShell projectId={projectId} />;
}
```

---
## FILE: src\app\editor\[projectId]\page.tsx

```
import { EditorPageClient } from "./editor-page-client";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EditorProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  return <EditorPageClient projectId={projectId} />;
}
```

---
## FILE: src\app\editor\layout.tsx

```
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">{children}</div>
  );
}
```

---
## FILE: src\app\layout.tsx

```
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Editor Maestro",
  description: "Editor de flyers — Next.js, Fabric.js, Zustand, Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

---
## FILE: src\app\login\page.tsx

```
import Link from "next/link";

import { signInAction } from "@/app/actions/auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const LOGIN_MESSAGES: Record<string, string> = {
  "confirm-email":
    "Si tu proyecto Supabase exige confirmación, revisá tu correo y luego ingresá acá.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const q = await searchParams;
  const infoMessage =
    q.message === "confirm-email"
      ? LOGIN_MESSAGES["confirm-email"]
      : q.message;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Ingresar
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Email y contraseña (Supabase Auth).
        </p>
      </div>

      <form action={signInAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        {q.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{q.error}</p>
        ) : null}
        {infoMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {infoMessage}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Registrate
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link href="/" className="text-zinc-500 underline dark:text-zinc-400">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
```

---
## FILE: src\app\new-project-button.tsx

```
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createProjectAction } from "@/app/actions/projects";

export function NewProjectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      onClick={async () => {
        setBusy(true);
        try {
          const r = await createProjectAction();
          if (r.ok) {
            router.push(`/editor/${r.id}`);
            return;
          }
          window.alert(r.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Creando…" : "Nuevo proyecto"}
    </button>
  );
}
```

---
## FILE: src\app\page.tsx

```
import Link from "next/link";

import { NewProjectButton } from "@/app/new-project-button";
import { SignOutForm } from "@/app/sign-out-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjectsForUser } from "@/services/projects/projects-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Editor Maestro
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Para cuenta y proyectos en la nube, configurá{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            y{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            en{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              .env.local
            </code>
            , ejecutá la migración en Supabase y reiniciá el servidor.
          </p>
        </div>
        <Link
          href="/editor/demo"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Abrir editor (demo local)
        </Link>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = user ? await listProjectsForUser(supabase) : [];

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Editor Maestro
          </h1>
          {user?.email ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </p>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <NewProjectButton />
              <SignOutForm />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
          Proyectos
        </h2>
        {!user ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Iniciá sesión para ver y crear proyectos guardados en Supabase.
          </p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Todavía no hay proyectos. Creá uno con &quot;Nuevo proyecto&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/editor/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="font-mono text-xs text-zinc-500">
                    {p.id.slice(0, 8)}…
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {new Date(p.created_at).toLocaleString("es")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        <Link href="/editor/demo" className="underline">
          Editor demo (sin cuenta)
        </Link>
      </p>
    </main>
  );
}
```

---
## FILE: src\app\register\page.tsx

```
import Link from "next/link";

import { signUpAction } from "@/app/actions/auth";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const q = await searchParams;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crear cuenta
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Registro con email. Si tu proyecto Supabase exige confirmación, revisá
          la bandeja de entrada.
        </p>
      </div>

      <form action={signUpAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        {q.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{q.error}</p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Registrarme
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Ingresar
        </Link>
      </p>
    </main>
  );
}
```

---
## FILE: src\app\sign-out-form.tsx

```
import { signOutAction } from "@/app/actions/auth";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Salir
      </button>
    </form>
  );
}
```

---
## FILE: src\entities\editor\defaults.ts

```
import { EDITOR_DOCUMENT_VERSION, type EditorDocument } from "./document-schema";

export function createElementId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyDocument(projectId: string): EditorDocument {
  const now = new Date().toISOString();
  return {
    version: EDITOR_DOCUMENT_VERSION,
    projectId,
    canvas: {
      width: 1080,
      height: 1350,
      backgroundColor: "#ffffff",
      elements: [],
    },
    meta: {
      title: "Sin título",
      updatedAt: now,
    },
  };
}
```

---
## FILE: src\entities\editor\document-schema.ts

```
/**
 * Modelo canónico del documento (serializable → Supabase / historial).
 * Fabric es proyección; estos tipos son la fuente de verdad.
 */

import type { ImageEffectsState } from "./image-effects";

export type ElementId = string;
export type ProjectId = string;

export const EDITOR_DOCUMENT_VERSION = 1 as const;

/** Origen de la familia tipográfica del texto. */
export type TextFontSource = "google" | "system";

export type BaseElement = {
  id: ElementId;
  locked: boolean;
  visible: boolean;
  opacity: number;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    originX: "left" | "center" | "right";
    originY: "top" | "center" | "bottom";
  };
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontSource: TextFontSource;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  textAlign: "left" | "center" | "right" | "justify";
  lineHeight: number;
  letterSpacing: number;
  width?: number;
};

export type ImageElement = BaseElement & {
  type: "image";
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  /**
   * Si es `true` (defecto), `scaleX` y `scaleY` se sincronizan al transformar
   * (proporción fija del bitmap escalado).
   */
  lockAspectRatio: boolean;
  /** Pipeline de filtros / ajustes (extensible). */
  effects: ImageEffectsState;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type CanvasElement = TextElement | ImageElement;

export type EditorCanvas = {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: {
    src: string;
    fit: "cover" | "contain" | "stretch";
  };
  /** Índice 0 = capa inferior (fondo). */
  elements: CanvasElement[];
};

export type EditorDocument = {
  version: typeof EDITOR_DOCUMENT_VERSION;
  projectId: ProjectId;
  canvas: EditorCanvas;
  meta: {
    title: string;
    updatedAt: string;
  };
};
```

---
## FILE: src\entities\editor\element-guards.ts

```
import type { CanvasElement, ImageElement, TextElement } from "./document-schema";

export function isTextElement(el: CanvasElement): el is TextElement {
  return el.type === "text";
}

export function isImageElement(el: CanvasElement): el is ImageElement {
  return el.type === "image";
}
```

---
## FILE: src\entities\editor\image-effects.ts

```
/**
 * Pipeline de efectos sobre imágenes del editor.
 * Hoy solo define estructura; la aplicación en Fabric vive en `image-effects-bridge`.
 *
 * Futuro: añadir variantes a `ImageEffectDescriptor` y mapear a `fabric.filters.*`.
 */

export type ImageEffectKind = "noop";

/** Un paso del pipeline (id estable para undo / diff). */
export type ImageEffectDescriptor = {
  readonly id: string;
  readonly kind: ImageEffectKind;
};

export type ImageEffectsState = {
  readonly version: 1;
  /** Orden de aplicación: el primero es el más “abajo” en la pila típica. */
  readonly pipeline: readonly ImageEffectDescriptor[];
};

export function createDefaultImageEffects(): ImageEffectsState {
  return { version: 1, pipeline: [] };
}

export function normalizeImageEffects(raw: unknown): ImageEffectsState {
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    (raw as ImageEffectsState).version === 1 &&
    Array.isArray((raw as ImageEffectsState).pipeline)
  ) {
    return raw as ImageEffectsState;
  }
  return createDefaultImageEffects();
}
```

---
## FILE: src\entities\editor\text-typography.ts

```
import type { TextElement, TextFontSource } from "./document-schema";

/**
 * Props de estilo de texto del editor (sin geometría ni `text` del contenido).
 * Conviven con `BaseElement`; el tipo `TextElement` las incorpora junto a `text`.
 */
export type EditorTextTypography = {
  fontSource: TextFontSource;
  /**
   * - `google`: nombre canónico en Google Fonts (ej. `"Inter"`, `"Open Sans"`).
   * - `system`: stack CSS completo (ej. `"ui-sans-serif, system-ui, sans-serif"`).
   */
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  textAlign: TextElement["textAlign"];
  lineHeight: number;
  letterSpacing: number;
  width?: number;
};

export const DEFAULT_EDITOR_TEXT_TYPOGRAPHY: EditorTextTypography = {
  fontSource: "google",
  fontFamily: "Inter",
  fontSize: 48,
  fontWeight: 600,
  fill: "#171717",
  textAlign: "left",
  lineHeight: 1.2,
  letterSpacing: 0,
};

/** Claves de tipografía en `TextElement` (no incluye `text`). */
export const TEXT_TYPOGRAPHY_KEYS = [
  "fontSource",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fill",
  "textAlign",
  "lineHeight",
  "letterSpacing",
  "width",
] as const satisfies readonly (keyof EditorTextTypography)[];

export type TextTypographyKey = (typeof TEXT_TYPOGRAPHY_KEYS)[number];

export function pickTextTypography(el: TextElement): EditorTextTypography {
  return {
    fontSource: el.fontSource,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fill: el.fill,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    ...(typeof el.width === "number" ? { width: el.width } : {}),
  };
}

export function mergeTextTypography(
  el: TextElement,
  patch: Partial<EditorTextTypography>,
): TextElement {
  return { ...el, ...patch };
}

/**
 * Garantiza defaults para documentos viejos o parciales.
 */
export function normalizeTextElement(el: TextElement): TextElement {
  return {
    ...DEFAULT_EDITOR_TEXT_TYPOGRAPHY,
    ...el,
    fontSource: el.fontSource ?? "system",
  };
}

/**
 * Valor `fontFamily` que recibe Fabric / canvas (CSS font shorthand compatible).
 */
export function toCanvasFontCSS(
  el: Pick<TextElement, "fontSource" | "fontFamily">,
): string {
  if (el.fontSource === "system") {
    return el.fontFamily;
  }
  const name = el.fontFamily.trim().replace(/\\/g, "").replace(/'/g, "");
  return `'${name}', ui-sans-serif, system-ui, sans-serif`;
}
```

---
## FILE: src\entities\editor\z-order.ts

```
import type { CanvasElement, ElementId } from "./document-schema";

export function reorderElements(
  elements: CanvasElement[],
  fromIndex: number,
  toIndex: number,
): CanvasElement[] {
  if (fromIndex === toIndex) return elements;
  const next = [...elements];
  const [removed] = next.splice(fromIndex, 1);
  if (!removed) return elements;
  next.splice(toIndex, 0, removed);
  return next;
}

export function elementIndexById(
  elements: CanvasElement[],
  id: ElementId,
): number {
  return elements.findIndex((e) => e.id === id);
}
```

---
## FILE: src\features\editor\canvas\canvas-reconciler.ts

```
"use client";

import type { CanvasElement, EditorDocument } from "@/entities/editor/document-schema";
import { FabricImage, type Canvas, type FabricObject } from "fabric";

import { getFabricElementId, setFabricElementId } from "./fabric-element-id";
import {
  applyCanvasLayoutToFabric,
  applyElementModelToFabricObject,
  fabricImageSrcMatches,
} from "./model-to-fabric";
import { createFabricObjectForElement } from "./object-factory";

export type ReconcileOptions = {
  /** Si devuelve true, se aborta el trabajo async pendiente (documento más nuevo). */
  isCancelled: () => boolean;
};

/**
 * Sincroniza el canvas Fabric con el documento sin recrear objetos innecesariamente.
 * - Elimina objetos huérfanos
 * - Recrea imágenes si cambió `src`
 * - Actualiza props en objetos existentes
 * - Reordena capas según `elements`
 * - Durante el batch usa `renderOnAddRemove = false` y un único `requestRenderAll`
 */
export async function reconcileFabricWithDocument(
  canvas: Canvas,
  document: EditorDocument,
  options: ReconcileOptions,
): Promise<void> {
  const board = document.canvas;
  const { elements } = board;

  const prevRenderOnAddRemove = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;

  try {
    applyCanvasLayoutToFabric(canvas, {
      width: board.width,
      height: board.height,
      backgroundColor: board.backgroundColor,
    });

    const docIds = new Set(elements.map((e) => e.id));

    for (const obj of [...canvas.getObjects()]) {
      const id = getFabricElementId(obj);
      if (id && !docIds.has(id)) {
        canvas.remove(obj);
      }
    }

    const fabricById = new Map<string, FabricObject>();
    for (const obj of canvas.getObjects()) {
      const id = getFabricElementId(obj);
      if (id) fabricById.set(id, obj);
    }

    for (const el of elements) {
      if (options.isCancelled()) return;

      let obj = fabricById.get(el.id);

      if (el.type === "image" && obj instanceof FabricImage) {
        if (!fabricImageSrcMatches(obj, el.src)) {
          canvas.remove(obj);
          fabricById.delete(el.id);
          obj = undefined;
        }
      }

      if (!obj) {
        const created = await createFabricObjectForElement(el);
        if (options.isCancelled()) return;
        if (!created) continue;
        setFabricElementId(created, el.id);
        canvas.add(created);
        fabricById.set(el.id, created);
        obj = created;
      } else {
        applyElementModelToFabricObject(obj, el);
        obj.setCoords();
      }
    }

    reorderFabricObjectsToMatchDocument(canvas, elements);
  } finally {
    canvas.renderOnAddRemove = prevRenderOnAddRemove;
    canvas.requestRenderAll();
  }
}

function reorderFabricObjectsToMatchDocument(
  canvas: Canvas,
  elements: CanvasElement[],
) {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;
    const obj = canvas
      .getObjects()
      .find((o) => getFabricElementId(o) === el.id);
    if (!obj) continue;
    canvas.moveObjectTo(obj, i);
  }
}
```

---
## FILE: src\features\editor\canvas\editor-canvas.tsx

```
"use client";

import { useRef } from "react";
import type { Canvas } from "fabric";

import { useFabricCanvasEvents } from "../hooks/use-fabric-canvas-events";
import { useFabricCanvasInstance } from "../hooks/use-fabric-canvas-instance";
import { useFabricDocumentReconcile } from "../hooks/use-fabric-document-reconcile";
import { useFabricStoreSelectionSync } from "../hooks/use-fabric-store-selection-sync";

type EditorCanvasProps = {
  className?: string;
  onCanvasReady?: (canvas: Canvas) => void;
};

export function EditorCanvas({ className, onCanvasReady }: EditorCanvasProps) {
  const reconcileGuardRef = useRef<boolean>(false);
  const suppressSelectionEventsRef = useRef<boolean>(false);

  const { canvasElRef, getCanvas } = useFabricCanvasInstance(
    reconcileGuardRef,
    onCanvasReady,
  );

  useFabricDocumentReconcile(getCanvas, reconcileGuardRef);
  useFabricStoreSelectionSync(getCanvas, suppressSelectionEventsRef);
  useFabricCanvasEvents({
    getCanvas,
    reconcileGuardRef,
    suppressSelectionEventsRef,
  });

  return (
    <div className={className} style={{ lineHeight: 0 }}>
      <canvas
        ref={canvasElRef}
        className="rounded-md border border-zinc-200 shadow-sm dark:border-zinc-700"
      />
    </div>
  );
}
```

---
## FILE: src\features\editor\canvas\fabric-element-id.ts

```
"use client";

import type { FabricObject } from "fabric";

/** Clave interna para enlazar objetos Fabric ↔ modelo (no serializar a Supabase). */
export const FABRIC_ELEMENT_ID_KEY = "__editorElementId" as const;

export function setFabricElementId(obj: FabricObject, id: string) {
  (obj as unknown as Record<string, string>)[FABRIC_ELEMENT_ID_KEY] = id;
}

export function getFabricElementId(obj: FabricObject): string | undefined {
  return (obj as unknown as Record<string, string | undefined>)[
    FABRIC_ELEMENT_ID_KEY
  ];
}

export function findFabricObjectByElementId(
  canvas: import("fabric").Canvas,
  elementId: string,
): FabricObject | undefined {
  return canvas.getObjects().find((o) => getFabricElementId(o) === elementId);
}
```

---
## FILE: src\features\editor\canvas\fabric-render-schedule.ts

```
import type { Canvas } from "fabric";

const rafByCanvas = new WeakMap<Canvas, number>();

/**
 * Agrupa varios `requestRenderAll` en un solo frame (útil durante drag/scale).
 * Fabric ya repinta en muchos eventos; esto evita encadenar renders síncronos extra.
 */
export function scheduleFabricRender(canvas: Canvas | null): void {
  if (!canvas) return;
  const prev = rafByCanvas.get(canvas);
  if (prev != null) cancelAnimationFrame(prev);
  const id = requestAnimationFrame(() => {
    rafByCanvas.delete(canvas);
    try {
      canvas.requestRenderAll();
    } catch {
      /* lienzo ya disposed */
    }
  });
  rafByCanvas.set(canvas, id);
}
```

---
## FILE: src\features\editor\canvas\fabric-selection.ts

```
"use client";

import type { MutableRefObject } from "react";

import type { ElementId } from "@/entities/editor/document-schema";
import type { Canvas, FabricObject } from "fabric";
import { ActiveSelection } from "fabric";

import { findFabricObjectByElementId } from "./fabric-element-id";

/**
 * Aplica la selección del store al canvas Fabric (panel de capas → canvas).
 * Pone `suppressSelectionEventsRef` en true mientras muta la selección para evitar bucles con listeners de Fabric.
 */
export function applyStoreSelectionToFabricCanvas(
  canvas: Canvas | null,
  selectedIds: ElementId[],
  suppressSelectionEventsRef: MutableRefObject<boolean>,
): void {
  if (!canvas) return;

  if (selectedIds.length === 0) {
    suppressSelectionEventsRef.current = true;
    try {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    } finally {
      queueMicrotask(() => {
        suppressSelectionEventsRef.current = false;
      });
    }
    return;
  }

  const targets = selectedIds
    .map((id) => findFabricObjectByElementId(canvas, id))
    .filter((x): x is FabricObject => Boolean(x));

  suppressSelectionEventsRef.current = true;
  try {
    if (targets.length === 1) {
      canvas.setActiveObject(targets[0]!);
    } else if (targets.length > 1) {
      const sel = new ActiveSelection(targets, { canvas });
      canvas.setActiveObject(sel);
    }
    canvas.requestRenderAll();
  } finally {
    queueMicrotask(() => {
      suppressSelectionEventsRef.current = false;
    });
  }
}
```

---
## FILE: src\features\editor\canvas\fabric-text-sync.ts

```
"use client";

import type { TextElement } from "@/entities/editor/document-schema";
import { GOOGLE_FONT_CANONICAL_NAMES } from "../fonts/google-fonts-catalog";

/**
 * Infiere `fontSource` / `fontFamily` del modelo a partir del CSS que expone Fabric.
 */
export function inferTextFontFromFabricCss(
  fabricFontFamily: string,
): Pick<TextElement, "fontSource" | "fontFamily"> {
  const m = fabricFontFamily.match(/^['"]([^'"]+)['"]\s*,/);
  const inner = m?.[1]?.trim();
  if (inner && GOOGLE_FONT_CANONICAL_NAMES.has(inner)) {
    return { fontSource: "google", fontFamily: inner };
  }
  return { fontSource: "system", fontFamily: fabricFontFamily };
}
```

---
## FILE: src\features\editor\canvas\fabric-to-model.ts

```
"use client";

import type { CanvasElement } from "@/entities/editor/document-schema";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import type { FabricObject } from "fabric";
import { ActiveSelection, FabricImage, FabricText, IText } from "fabric";

import {
  applyFabricTextProps,
  applyFabricTransformToElement,
} from "../store/document-mutations";

import { inferTextFontFromFabricCss } from "./fabric-text-sync";
import { pickUniformImageScale } from "./image-transform";

/**
 * Expande el target de un evento Fabric (incluye selección múltiple).
 */
export function expandFabricEventTargets(target: FabricObject): FabricObject[] {
  if (target instanceof ActiveSelection) {
    return target.getObjects();
  }
  return [target];
}

export function mergeFabricObjectIntoElement(
  el: CanvasElement,
  target: FabricObject,
): CanvasElement {
  const sx = target.scaleX ?? 1;
  const sy = target.scaleY ?? 1;
  const lockImage =
    isImageElement(el) && el.lockAspectRatio !== false && target instanceof FabricImage;
  const scaleX = lockImage ? pickUniformImageScale(sx, sy) : sx;
  const scaleY = lockImage ? pickUniformImageScale(sx, sy) : sy;

  let next = applyFabricTransformToElement(el, {
    left: target.left ?? 0,
    top: target.top ?? 0,
    scaleX,
    scaleY,
    angle: target.angle ?? 0,
    originX: (target.originX ?? "left") as CanvasElement["transform"]["originX"],
    originY: (target.originY ?? "top") as CanvasElement["transform"]["originY"],
  });

  if (isTextElement(next) && (target instanceof IText || target instanceof FabricText)) {
    const ff =
      typeof target.fontFamily === "string" ? target.fontFamily : undefined;
    next = applyFabricTextProps(
      next,
      {
        text: target.text,
        fontSize: target.fontSize,
        fill: typeof target.fill === "string" ? target.fill : undefined,
        fontFamily: ff,
        fontWeight: target.fontWeight,
        textAlign: typeof target.textAlign === "string" ? target.textAlign : undefined,
      },
      inferTextFontFromFabricCss,
    );
  }

  if (isImageElement(next) && target instanceof FabricImage) {
    const src = target.getSrc();
    if (src && src !== next.src) {
      next = { ...next, src };
    }
  }

  return next;
}
```

---
## FILE: src\features\editor\canvas\image-effects-bridge.ts

```
"use client";

import type { ImageElement } from "@/entities/editor/document-schema";
import type { FabricImage } from "fabric";

/**
 * Aplica `effects.pipeline` al objeto Fabric.
 * Hoy es no-op salvo recorrido; futuro: mapear a `fabric.filters` y `applyFilters()`.
 */
export function applyImageEffectsToFabricImage(
  _img: FabricImage,
  element: Pick<ImageElement, "effects">,
): void {
  for (const stage of element.effects.pipeline) {
    switch (stage.kind) {
      case "noop":
        break;
      default:
        break;
    }
  }
}
```

---
## FILE: src\features\editor\canvas\image-max-edge.ts

```
/** Borde máximo (px) del bitmap en GPU; fotos enormes se remuestrean antes de Fabric. */
export const FABRIC_IMAGE_MAX_DISPLAY_EDGE_PX = 4096;
```

---
## FILE: src\features\editor\canvas\image-transform.ts

```
"use client";

/**
 * Unifica escalas para mantener proporción del bitmap (scaleX === scaleY en modelo Fabric típico).
 */
export function pickUniformImageScale(scaleX: number, scaleY: number): number {
  const ax = Math.abs(scaleX);
  const ay = Math.abs(scaleY);
  const m = Math.max(ax, ay);
  const sign = Math.sign(scaleX) || 1;
  return sign * m;
}
```

---
## FILE: src\features\editor\canvas\model-to-fabric.ts

```
"use client";

import type { CanvasElement, EditorCanvas } from "@/entities/editor/document-schema";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import {
  normalizeTextElement,
  toCanvasFontCSS,
} from "@/entities/editor/text-typography";
import type { Canvas, FabricObject } from "fabric";
import { FabricImage, FabricText, IText } from "fabric";

import { applyImageEffectsToFabricImage } from "./image-effects-bridge";
import { getFabricElementId } from "./fabric-element-id";

function mapTextAlign(
  align: (CanvasElement & { type: "text" })["textAlign"],
): "left" | "center" | "right" | "justify" | "justify-left" {
  return align === "justify" ? "justify-left" : align;
}

/**
 * Aplica layout del documento al canvas (dimensiones y fondo).
 * El caller debe llamar `requestRenderAll` al cerrar el batch.
 */
export function applyCanvasLayoutToFabric(
  canvas: Canvas,
  layout: Pick<EditorCanvas, "width" | "height" | "backgroundColor">,
) {
  canvas.setDimensions({ width: layout.width, height: layout.height });
  canvas.backgroundColor = layout.backgroundColor;
}

export function fabricImageSrcMatches(img: FabricImage, src: string): boolean {
  return img.getSrc() === src;
}

/**
 * Actualiza un objeto Fabric existente desde el modelo (sin recrear).
 * Para cambios de `src` en imágenes, el reconciler debe recrear el objeto.
 */
export function applyElementModelToFabricObject(
  obj: FabricObject,
  el: CanvasElement,
): { needsCoords: boolean } {
  const id = getFabricElementId(obj);
  if (!id || id !== el.id) {
    return { needsCoords: false };
  }

  obj.set({
    left: el.transform.x,
    top: el.transform.y,
    angle: el.transform.rotation,
    scaleX: el.transform.scaleX,
    scaleY: el.transform.scaleY,
    originX: el.transform.originX,
    originY: el.transform.originY,
    opacity: el.opacity,
    visible: el.visible,
    selectable: !el.locked,
    evented: !el.locked,
  });

  if (isTextElement(el) && (obj instanceof IText || obj instanceof FabricText)) {
    const t = normalizeTextElement(el);
    const textAlign = mapTextAlign(t.textAlign);
    obj.set({
      text: t.text,
      fontFamily: toCanvasFontCSS(t),
      fontSize: t.fontSize,
      fontWeight: String(t.fontWeight),
      fill: t.fill,
      textAlign,
      lineHeight: t.lineHeight,
      charSpacing: t.letterSpacing,
      ...(typeof t.width === "number" ? { width: t.width } : {}),
    });
  }

  if (isImageElement(el) && obj instanceof FabricImage) {
    if (el.crop) {
      obj.set({
        cropX: el.crop.x,
        cropY: el.crop.y,
        width: el.crop.width,
        height: el.crop.height,
      });
    }
    obj.set({ lockScalingFlip: true });
    applyImageEffectsToFabricImage(obj, el);
  }

  return { needsCoords: true };
}
```

---
## FILE: src\features\editor\canvas\object-factory.ts

```
"use client";

import type { CanvasElement } from "@/entities/editor/document-schema";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import {
  normalizeTextElement,
  toCanvasFontCSS,
} from "@/entities/editor/text-typography";
import type { Canvas, FabricImage, FabricObject } from "fabric";
import { FabricImage as FabricImageClass, IText } from "fabric";

import { applyImageEffectsToFabricImage } from "./image-effects-bridge";
import { setFabricElementId } from "./fabric-element-id";
import { resampleImageUrlForCanvasIfNeeded } from "./resample-image-url-for-canvas";

function mapTextAlign(
  align: (CanvasElement & { type: "text" })["textAlign"],
): "left" | "center" | "right" | "justify" | "justify-left" {
  return align === "justify" ? "justify-left" : align;
}

/**
 * Crea un `IText` editable alineado con {@link TextElement}.
 */
export function createFabricTextFromElement(el: CanvasElement): IText | null {
  if (!isTextElement(el)) return null;
  const t = normalizeTextElement(el);
  const textAlign = mapTextAlign(t.textAlign);
  return new IText(t.text, {
    objectCaching: true,
    left: t.transform.x,
    top: t.transform.y,
    angle: t.transform.rotation,
    scaleX: t.transform.scaleX,
    scaleY: t.transform.scaleY,
    originX: t.transform.originX,
    originY: t.transform.originY,
    opacity: t.opacity,
    visible: t.visible,
    selectable: !t.locked,
    evented: !t.locked,
    editable: !t.locked,
    fontFamily: toCanvasFontCSS(t),
    fontSize: t.fontSize,
    fontWeight: String(t.fontWeight),
    fill: t.fill,
    textAlign,
    lineHeight: t.lineHeight,
    charSpacing: t.letterSpacing,
    ...(typeof t.width === "number" ? { width: t.width } : {}),
  });
}

export async function createFabricImageFromElement(
  el: CanvasElement,
): Promise<FabricImage | null> {
  if (!isImageElement(el)) return null;
  let src = el.src;
  if (el.naturalWidth > 0 && el.naturalHeight > 0) {
    src = await resampleImageUrlForCanvasIfNeeded(
      el.src,
      el.naturalWidth,
      el.naturalHeight,
    );
  }
  const img = await FabricImageClass.fromURL(src, {
    crossOrigin: "anonymous",
  });
  img.set({
    objectCaching: true,
    left: el.transform.x,
    top: el.transform.y,
    angle: el.transform.rotation,
    scaleX: el.transform.scaleX,
    scaleY: el.transform.scaleY,
    originX: el.transform.originX,
    originY: el.transform.originY,
    opacity: el.opacity,
    visible: el.visible,
    selectable: !el.locked,
    evented: !el.locked,
    lockScalingFlip: true,
  });
  applyImageEffectsToFabricImage(img, el);
  return img;
}

export async function createFabricObjectForElement(
  el: CanvasElement,
): Promise<FabricObject | null> {
  if (isTextElement(el)) {
    return createFabricTextFromElement(el);
  }
  if (isImageElement(el)) {
    return createFabricImageFromElement(el);
  }
  return null;
}

export async function buildFabricObjectsFromDocument(
  elements: CanvasElement[],
): Promise<FabricObject[]> {
  const out: FabricObject[] = [];
  for (const el of elements) {
    const o = await createFabricObjectForElement(el);
    if (o) {
      setFabricElementId(o, el.id);
      out.push(o);
    }
  }
  return out;
}

export function disposeCanvas(canvas: Canvas | null) {
  if (!canvas) return;
  canvas.dispose();
}
```

---
## FILE: src\features\editor\canvas\resample-image-url-for-canvas.ts

```
import { FABRIC_IMAGE_MAX_DISPLAY_EDGE_PX } from "./image-max-edge";

/**
 * Si la imagen remota supera el borde máximo, devuelve un data URL PNG remuestreado
 * para reducir memoria GPU y tiempo de `toDataURL` en exportación.
 * Falla en silencio hacia `originalUrl` si fetch/CORS no permite leer píxeles.
 */
export async function resampleImageUrlForCanvasIfNeeded(
  originalUrl: string,
  naturalWidth: number,
  naturalHeight: number,
  maxEdge: number = FABRIC_IMAGE_MAX_DISPLAY_EDGE_PX,
): Promise<string> {
  if (
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    (naturalWidth <= maxEdge && naturalHeight <= maxEdge)
  ) {
    return originalUrl;
  }
  try {
    const res = await fetch(originalUrl, { mode: "cors", credentials: "omit" });
    if (!res.ok) return originalUrl;
    const blob = await res.blob();
    const scale = Math.min(
      maxEdge / naturalWidth,
      maxEdge / naturalHeight,
      1,
    );
    const tw = Math.max(1, Math.round(naturalWidth * scale));
    const th = Math.max(1, Math.round(naturalHeight * scale));
    const bmp = await createImageBitmap(blob, {
      resizeWidth: tw,
      resizeHeight: th,
      resizeQuality: "high",
    });
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d");
    if (!ctx) {
      bmp.close();
      return originalUrl;
    }
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return c.toDataURL("image/png");
  } catch {
    return originalUrl;
  }
}
```

---
## FILE: src\features\editor\editor-shell.tsx

```
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Canvas } from "fabric";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getProjectById } from "@/services/projects/projects-service";

import { MagicErasePanel } from "./magic-erase/magic-erase-panel";
import { EditorCanvas } from "./canvas/editor-canvas";
import { LayersPanel } from "./layers/layers-panel";
import { TextInspectorPanel } from "./text/text-inspector-panel";
import { EditorToolbar } from "./toolbar/editor-toolbar";
import { loadGoogleFontFamily } from "./fonts/google-font-loader";
import {
  loadEditorDocument,
  resetEditorForProject,
} from "./store/editor-store";

type EditorShellProps = {
  projectId: string;
};

export function EditorShell({ projectId }: EditorShellProps) {
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPending, setLoadPending] = useState(projectId !== "demo");

  useEffect(() => {
    if (projectId === "demo") {
      resetEditorForProject("demo");
      setLoadError(null);
      setLoadPending(false);
      return;
    }

    resetEditorForProject(projectId);
    setLoadError(null);
    setLoadPending(true);

    if (!isSupabaseConfigured()) {
      setLoadError(
        "Supabase no está configurado: no se puede cargar este proyecto.",
      );
      setLoadPending(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setLoadError("Iniciá sesión para abrir este proyecto.");
          }
          return;
        }
        const row = await getProjectById(supabase, projectId);
        if (cancelled) return;
        if (!row) {
          setLoadError("No se encontró el proyecto o no tenés acceso.");
          return;
        }
        loadEditorDocument(row.data);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Error al cargar el proyecto.",
          );
        }
      } finally {
        if (!cancelled) setLoadPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    void loadGoogleFontFamily("Inter");
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-100 dark:bg-zinc-950">
      {loadPending ? (
        <div className="border-b border-zinc-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-zinc-700 dark:bg-amber-950/40 dark:text-amber-100">
          Cargando proyecto…
        </div>
      ) : null}
      {loadError ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-zinc-700 dark:bg-red-950/30 dark:text-red-100">
          <span>{loadError}</span>
          <Link href="/login" className="font-medium underline">
            Ir a ingresar
          </Link>
          <Link href="/" className="font-medium underline">
            Inicio
          </Link>
        </div>
      ) : null}
      <EditorToolbar
        projectId={projectId}
        fabricCanvasGetter={() => fabricCanvasRef.current}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
          <EditorCanvas
            onCanvasReady={(c) => {
              fabricCanvasRef.current = c;
            }}
          />
        </div>
        <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
          <MagicErasePanel getCanvas={() => fabricCanvasRef.current} />
          <TextInspectorPanel />
          <LayersPanel />
        </aside>
      </div>
    </div>
  );
}
```

---
## FILE: src\features\editor\export\export-types.ts

```
/**
 * Tipos del sistema de exportación (raster + PDF + extensión prensa / CMYK futura).
 */

export const EXPORT_SCALE_PRESETS = [1, 2, 3, 4] as const;
export type ExportScalePreset = (typeof EXPORT_SCALE_PRESETS)[number];

/** Formato principal elegido en el modal. */
export type ExportFormatKind = "png" | "jpeg" | "pdf-rgb" | "pdf-print";

/** Cómo se incrusta el raster en el PDF. */
export type PdfRasterEncoding = "png-lossless" | "jpeg-high";

/**
 * Estado del formulario de exportación (UI ↔ servicio).
 * Campos irrelevantes para un formato se ignoran en el servicio.
 */
export type ExportFormState = {
  format: ExportFormatKind;
  scale: ExportScalePreset;
  /** Solo PNG: si es `false`, se aplana sobre el color de fondo del documento. */
  pngPreserveTransparency: boolean;
  /** JPEG y PDF con incrustación JPEG (0.85 … 1). */
  jpegQuality: number;
  /** Solo PDF: calidad / tamaño del XObject embebido. */
  pdfRasterEncoding: PdfRasterEncoding;
  /**
   * Solo PDF impresión: sangrado en mm alrededor del cajón lógico.
   * El lienzo lógico se centra en la página ampliada.
   */
  bleedMm: number;
  /**
   * Tras el PDF RGB + JSON, solicitar al servidor un PDF CMYK real (`/api/export-print`).
   */
  requestServerCmykPdf: boolean;
  /** Marcas de corte en la zona de sangrado (solo PDF CMYK servidor). */
  drawPrintCropMarks: boolean;
};

export const DEFAULT_EXPORT_FORM: ExportFormState = {
  format: "png",
  scale: 2,
  pngPreserveTransparency: true,
  jpegQuality: 0.95,
  pdfRasterEncoding: "png-lossless",
  bleedMm: 3,
  requestServerCmykPdf: false,
  drawPrintCropMarks: false,
};

/** Límites de escala (coherentes con Fabric `multiplier`). */
export const EXPORT_MULTIPLIER_MIN = 0.5;
export const EXPORT_MULTIPLIER_MAX = 8;

export function clampExportMultiplier(value: number): number {
  const n = Number.isFinite(value) ? value : 1;
  return Math.min(EXPORT_MULTIPLIER_MAX, Math.max(EXPORT_MULTIPLIER_MIN, n));
}

/**
 * Payload versionado para un backend de prensa (CMYK, RIP, etc.).
 * El PDF generado hoy sigue siendo RGB embebido; este JSON describe intención y medidas.
 */
export type PrintJobPayloadV1 = {
  readonly schema: "editor-maestro.print-job/v1";
  readonly createdAtIso: string;
  readonly documentTitle: string;
  readonly artboardLogicalPx: { readonly width: number; readonly height: number };
  /** `multiplier` usado al rasterizar desde Fabric. */
  readonly exportScale: ExportScalePreset;
  readonly bleedMm: number;
  readonly pdfRgb: {
    readonly pageSizePt: { readonly width: number; readonly height: number };
    readonly contentBoxPt: { readonly width: number; readonly height: number };
    readonly contentOriginPt: { readonly x: number; readonly y: number };
  };
  readonly color: {
    readonly embedded: "sRGB";
    readonly requestedPipeline: "await-backend-cmyk-conversion";
  };
  readonly raster: {
    readonly encoding: "image/png" | "image/jpeg";
    readonly intrinsicPx: { readonly width: number; readonly height: number };
  };
};
```

---
## FILE: src\features\editor\export\index.ts

```
export type {
  ExportFormatKind,
  ExportFormState,
  ExportScalePreset,
  PdfRasterEncoding,
  PrintJobPayloadV1,
} from "./export-types";
export {
  clampExportMultiplier,
  DEFAULT_EXPORT_FORM,
  EXPORT_MULTIPLIER_MAX,
  EXPORT_MULTIPLIER_MIN,
  EXPORT_SCALE_PRESETS,
} from "./export-types";
export { executeExportDownload } from "./services/export-service";
```

---
## FILE: src\features\editor\export\services\canvas-export-session.ts

```
import type { Canvas, FabricObject } from "fabric";

/**
 * Aísla el estado visual del lienzo durante la exportación:
 * sin selección activa (controles / handles) para que `toDataURL` refleje solo el arte.
 */
export async function withFabricExportSession<T>(
  canvas: Canvas,
  run: () => T | Promise<T>,
): Promise<T> {
  const previousActive = canvas.getActiveObject() as FabricObject | undefined;
  canvas.discardActiveObject();
  canvas.requestRenderAll();

  try {
    return await run();
  } finally {
    if (previousActive) {
      canvas.setActiveObject(previousActive);
    }
    canvas.requestRenderAll();
  }
}
```

---
## FILE: src\features\editor\export\services\export-filename.ts

```
const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeExportBaseName(title: string, fallback: string): string {
  const raw = title.trim() || fallback;
  const cleaned = raw.replace(INVALID_CHARS, "_").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : fallback;
}

export function buildExportFileName(args: {
  base: string;
  scale: number;
  ext: "png" | "jpg" | "pdf" | "json";
}): string {
  const scaleLabel = Number.isInteger(args.scale)
    ? `${args.scale}x`
    : `${args.scale.toFixed(2)}x`;
  const safeBase = args.base.replace(/\s/g, "-");
  return `${safeBase}-${scaleLabel}.${args.ext}`;
}
```

---
## FILE: src\features\editor\export\services\export-pipeline.ts

```
import { yieldToMain } from "@/lib/scheduling/yield-to-main";

import { decodeDataUrlToBytesViaWorkerIfLarge } from "./export-worker-bridge";

export { yieldToMain } from "@/lib/scheduling/yield-to-main";

/**
 * Decodifica raster para PDF u operaciones posteriores, con yield previo y worker opcional.
 */
export async function decodeRasterForExport(dataUrl: string): Promise<Uint8Array> {
  await yieldToMain();
  return decodeDataUrlToBytesViaWorkerIfLarge(dataUrl);
}
```

---
## FILE: src\features\editor\export\services\export-service.ts

```
import type { Canvas } from "fabric";

import type { EditorDocument } from "@/entities/editor/document-schema";

import type { ExportFormState } from "../export-types";
import { clampExportMultiplier } from "../export-types";

import { withFabricExportSession } from "./canvas-export-session";
import {
  captureFabricRasterDataUrl,
  flattenPngDataUrlOnBackground,
  readRasterDataUrlSize,
} from "./fabric-raster-capture";
import { buildExportFileName, sanitizeExportBaseName } from "./export-filename";
import { decodeRasterForExport, yieldToMain } from "./export-pipeline";
import { buildPrintJobPayloadV1 } from "./print-job-payload";
import { requestPrintCmykPdfDownload } from "./print-export-client";
import { buildPrintProfileRgbPdf, buildStandardRgbPdf } from "./pdf-export";

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

function triggerDownloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Orquesta exportación completa: sesión limpia en Fabric, raster con `multiplier`,
 * descarga(s) según formato (PDF imprime también el manifiesto JSON para backend CMYK).
 *
 * Entre pasos pesados se llama `yieldToMain` para reducir bloqueos del hilo UI.
 * La decodificación base64 grande puede delegarse a un Web Worker vía `decodeRasterForExport`.
 */
export async function executeExportDownload(args: {
  canvas: Canvas;
  document: EditorDocument;
  form: ExportFormState;
}): Promise<void> {
  const { canvas, document: doc, form } = args;
  const multiplier = clampExportMultiplier(form.scale);
  const base = sanitizeExportBaseName(doc.meta.title, "diseno");
  const bg = doc.canvas.backgroundColor || "#ffffff";
  const lw = doc.canvas.width;
  const lh = doc.canvas.height;

  await withFabricExportSession(canvas, async () => {
    switch (form.format) {
      case "png": {
        let dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: "png",
        });
        await yieldToMain();
        if (!form.pngPreserveTransparency) {
          dataUrl = await flattenPngDataUrlOnBackground(dataUrl, bg);
          await yieldToMain();
        }
        triggerDownloadDataUrl(
          dataUrl,
          buildExportFileName({ base, scale: multiplier, ext: "png" }),
        );
        return;
      }
      case "jpeg": {
        const dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: "jpeg",
          jpegQuality: form.jpegQuality,
        });
        await yieldToMain();
        triggerDownloadDataUrl(
          dataUrl,
          buildExportFileName({ base, scale: multiplier, ext: "jpg" }),
        );
        return;
      }
      case "pdf-rgb": {
        const usePng = form.pdfRasterEncoding === "png-lossless";
        const dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: usePng ? "png" : "jpeg",
          jpegQuality: form.jpegQuality,
        });
        await yieldToMain();
        const bytes = await decodeRasterForExport(dataUrl);
        await yieldToMain();
        const pdfBytes = await buildStandardRgbPdf({
          pageSizePt: { width: lw, height: lh },
          title: doc.meta.title,
          rasterBytes: bytes,
          rasterIsPng: usePng,
          keywords: ["EditorMaestro", "rgb-screen", `scale-${multiplier}x`],
        });
        await yieldToMain();
        triggerDownloadBlob(
          new Blob([uint8ArrayToArrayBuffer(pdfBytes)], {
            type: "application/pdf",
          }),
          buildExportFileName({ base, scale: multiplier, ext: "pdf" }),
        );
        return;
      }
      case "pdf-print": {
        const usePng = form.pdfRasterEncoding === "png-lossless";
        const dataUrl = captureFabricRasterDataUrl({
          canvas,
          multiplier,
          format: usePng ? "png" : "jpeg",
          jpegQuality: form.jpegQuality,
        });
        await yieldToMain();
        const bleedPt = mmToPt(form.bleedMm);
        const bytes = await decodeRasterForExport(dataUrl);
        await yieldToMain();
        const pdfBytes = await buildPrintProfileRgbPdf({
          pageSizePt: { width: lw, height: lh },
          title: doc.meta.title,
          rasterBytes: bytes,
          rasterIsPng: usePng,
          bleedPt,
        });

        const intrinsic = await readRasterDataUrlSize(dataUrl);
        await yieldToMain();
        const job = buildPrintJobPayloadV1({
          document: doc,
          scale: form.scale,
          bleedMm: form.bleedMm,
          pageSizePt: {
            width: lw + 2 * bleedPt,
            height: lh + 2 * bleedPt,
          },
          contentBoxPt: { width: lw, height: lh },
          contentOriginPt: { x: bleedPt, y: bleedPt },
          rasterEncoding: usePng ? "image/png" : "image/jpeg",
          intrinsicPx: intrinsic,
        });

        const slug = base.replace(/\s+/g, "-");
        triggerDownloadBlob(
          new Blob([uint8ArrayToArrayBuffer(pdfBytes)], {
            type: "application/pdf",
          }),
          `${slug}-${multiplier}x-print.pdf`,
        );
        await yieldToMain();
        triggerDownloadBlob(
          new Blob([JSON.stringify(job, null, 2)], {
            type: "application/json",
          }),
          `${slug}-${multiplier}x-print-job.json`,
        );

        if (form.requestServerCmykPdf) {
          await yieldToMain();
          const { blob, filename } = await requestPrintCmykPdfDownload({
            imageDataUrl: dataUrl,
            bleedMm: form.bleedMm,
            title: doc.meta.title,
            drawCropMarks: form.drawPrintCropMarks,
            targetDpi: 300,
          });
          await yieldToMain();
          triggerDownloadBlob(blob, filename);
        }
        return;
      }
    }
  });
}
```

---
## FILE: src\features\editor\export\services\export-worker-bridge.ts

```
import { dataUrlToUint8Array } from "./fabric-raster-capture";

type DecodeResult = { id: number; buffer?: ArrayBuffer; error?: string };

const pending = new Map<
  number,
  { resolve: (v: Uint8Array) => void; reject: (e: Error) => void }
>();

let worker: Worker | null = null;
let seq = 0;

function attachWorkerHandlers(w: Worker): void {
  w.onmessage = (ev: MessageEvent<DecodeResult>) => {
    const { id, buffer, error } = ev.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error || !buffer) {
      p.reject(new Error(error || "decode_worker"));
      return;
    }
    p.resolve(new Uint8Array(buffer));
  };
  w.onerror = () => {
    for (const [, pr] of pending) {
      pr.reject(new Error("decode_worker_crash"));
    }
    pending.clear();
    worker = null;
  };
}

function getDecodeWorker(): Worker | null {
  if (typeof Worker === "undefined" || typeof import.meta.url === "undefined") {
    return null;
  }
  if (worker) return worker;
  try {
    const w = new Worker(
      new URL("../worker/export-decode.worker.ts", import.meta.url),
      { type: "classic" },
    );
    attachWorkerHandlers(w);
    worker = w;
    return w;
  } catch {
    return null;
  }
}

/**
 * Para data URLs muy grandes, el decode base64 en worker evita un long task en el main.
 */
export function decodeDataUrlToBytesViaWorkerIfLarge(
  dataUrl: string,
): Promise<Uint8Array> {
  if (dataUrl.length < 2_000_000) {
    return Promise.resolve(dataUrlToUint8Array(dataUrl));
  }
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    return Promise.resolve(dataUrlToUint8Array(dataUrl));
  }
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  const w = getDecodeWorker();
  if (!w) {
    return Promise.resolve(dataUrlToUint8Array(dataUrl));
  }
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, b64 } satisfies { id: number; b64: string });
  });
}
```

---
## FILE: src\features\editor\export\services\fabric-raster-capture.ts

```
import type { Canvas } from "fabric";

import { clampExportMultiplier } from "../export-types";

export type FabricRasterCaptureFormat = "png" | "jpeg";

export type FabricRasterCaptureOptions = {
  canvas: Canvas;
  multiplier: number;
  format: FabricRasterCaptureFormat;
  /** Solo JPEG. */
  jpegQuality?: number;
};

/**
 * Captura el lienzo con `toDataURL` y `multiplier` (alta resolución).
 * Debe ejecutarse dentro de {@link withFabricExportSession} para un frame limpio.
 */
export function captureFabricRasterDataUrl(options: FabricRasterCaptureOptions): string {
  const m = clampExportMultiplier(options.multiplier);
  options.canvas.renderAll();

  if (options.format === "jpeg") {
    const q = options.jpegQuality ?? 0.92;
    return options.canvas.toDataURL({
      format: "jpeg",
      multiplier: m,
      quality: Math.min(1, Math.max(0.05, q)),
    });
  }

  return options.canvas.toDataURL({
    format: "png",
    multiplier: m,
  });
}

export async function readRasterDataUrlSize(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el raster para aplanar."));
    img.src = src;
  });
}

/**
 * Convierte PNG con alpha en PNG opaco sobre un color sólido (simula “sin transparencia”).
 */
export async function flattenPngDataUrlOnBackground(
  pngDataUrl: string,
  backgroundCss: string,
): Promise<string> {
  const img = await loadImage(pngDataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo crear contexto 2D para aplanar PNG.");
  }
  ctx.fillStyle = backgroundCss;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Data URL inválida.");
  }
  const meta = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  if (!meta.startsWith("data:") || !base64) {
    throw new Error("Data URL inválida.");
  }
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}
```

---
## FILE: src\features\editor\export\services\pdf-export.ts

```
import { PDFDocument, PDFImage, PDFPage, rgb } from "pdf-lib";

export type PdfStandardRgbBuildArgs = {
  /** Tamaño de página en puntos (= cajón lógico del diseño). */
  pageSizePt: { width: number; height: number };
  title: string;
  subject?: string;
  keywords?: string[];
  rasterBytes: Uint8Array;
  rasterIsPng: boolean;
};

export type PdfPrintBuildArgs = PdfStandardRgbBuildArgs & {
  bleedPt: number;
};

function drawRasterOnPage(args: {
  page: PDFPage;
  embedded: PDFImage;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
}): void {
  const { page, embedded, drawX, drawY, drawW, drawH } = args;
  page.drawImage(embedded, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
  });
}

/**
 * PDF RGB estándar: una página, fondo blanco, imagen a tamaño lógico en puntos.
 */
export async function buildStandardRgbPdf(
  args: PdfStandardRgbBuildArgs,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(args.title);
  pdf.setAuthor("Editor Maestro");
  pdf.setCreator("Editor Maestro");
  pdf.setProducer("Editor Maestro / pdf-lib");
  if (args.subject) pdf.setSubject(args.subject);
  if (args.keywords?.length) pdf.setKeywords(args.keywords);

  const page = pdf.addPage([args.pageSizePt.width, args.pageSizePt.height]);
  const pw = page.getWidth();
  const ph = page.getHeight();

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pw,
    height: ph,
    color: rgb(1, 1, 1),
  });

  const embedded = args.rasterIsPng
    ? await pdf.embedPng(args.rasterBytes)
    : await pdf.embedJpg(args.rasterBytes);

  drawRasterOnPage({
    page,
    embedded,
    drawX: 0,
    drawY: 0,
    drawW: pw,
    drawH: ph,
  });

  return pdf.save();
}

/**
 * PDF “prensa”: página con sangrado, cajón lógico centrado, listo para pipeline CMYK externo.
 */
export async function buildPrintProfileRgbPdf(
  args: PdfPrintBuildArgs,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${args.title} (print)`);
  pdf.setAuthor("Editor Maestro");
  pdf.setCreator("Editor Maestro");
  pdf.setProducer("Editor Maestro / pdf-lib");
  pdf.setSubject(
    args.subject ??
      "RGB preliminar — conversión CMYK y perfiles ICC deben aplicarse en backend.",
  );
  pdf.setKeywords([
    "EditorMaestro",
    "print-profile",
    "rgb-source",
    "cmyk-pending",
    ...(args.keywords ?? []),
  ]);

  const { width: lw, height: lh } = args.pageSizePt;
  const b = args.bleedPt;
  const pageW = lw + 2 * b;
  const pageH = lh + 2 * b;

  const page = pdf.addPage([pageW, pageH]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    color: rgb(1, 1, 1),
  });

  const embedded = args.rasterIsPng
    ? await pdf.embedPng(args.rasterBytes)
    : await pdf.embedJpg(args.rasterBytes);

  const drawX = b;
  const drawY = b;

  drawRasterOnPage({
    page,
    embedded,
    drawX,
    drawY,
    drawW: lw,
    drawH: lh,
  });

  return pdf.save();
}
```

---
## FILE: src\features\editor\export\services\print-export-client.ts

```
export type RequestPrintCmykPdfArgs = {
  imageDataUrl: string;
  bleedMm: number;
  title: string;
  drawCropMarks: boolean;
  /** DPI lógico para mapear píxeles → puntos PDF (72–600). */
  targetDpi?: number;
};

export type RequestPrintCmykPdfResult = {
  blob: Blob;
  filename: string;
};

function messageForError(code: string | undefined, status: number): string {
  switch (code) {
    case "unauthorized":
      return "Iniciá sesión para generar el PDF CMYK.";
    case "rate_limit":
      return "Demasiadas solicitudes de impresión CMYK. Esperá un momento.";
    case "too_many_concurrent_requests":
      return "Ya hay una exportación CMYK en curso.";
    case "payload_too_large":
      return "La imagen es demasiado grande para el servidor.";
    case "dimensions_exceed_limit":
      return "La imagen supera el tamaño máximo permitido.";
    case "raster_too_many_pixels":
      return "Resolución demasiado alta; probá con menor escala de exportación.";
    case "cmyk_export_failed":
      return "El servidor no pudo generar el PDF CMYK.";
    default:
      return `Error del servidor (${status}).`;
  }
}

/**
 * POST a `/api/export-print` y devuelve el PDF CMYK como Blob.
 */
export async function requestPrintCmykPdfDownload(
  args: RequestPrintCmykPdfArgs,
): Promise<RequestPrintCmykPdfResult> {
  const body = JSON.stringify({
    imageDataUrl: args.imageDataUrl,
    bleedMm: args.bleedMm,
    title: args.title,
    drawCropMarks: args.drawCropMarks,
    targetDpi: args.targetDpi ?? 300,
  });
  const res = await fetch("/api/export-print", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const cd = res.headers.get("Content-Disposition");
  const filenameMatch = cd?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? "print-cmyk.pdf";

  if (!res.ok) {
    let code: string | undefined;
    try {
      const j = (await res.json()) as { error?: string };
      code = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(messageForError(code, res.status));
  }

  const blob = await res.blob();
  return { blob, filename };
}
```

---
## FILE: src\features\editor\export\services\print-job-payload.ts

```
import type { EditorDocument } from "@/entities/editor/document-schema";

import type { ExportScalePreset, PrintJobPayloadV1 } from "../export-types";

export function buildPrintJobPayloadV1(args: {
  document: EditorDocument;
  scale: ExportScalePreset;
  bleedMm: number;
  pageSizePt: { width: number; height: number };
  contentBoxPt: { width: number; height: number };
  contentOriginPt: { x: number; y: number };
  rasterEncoding: "image/png" | "image/jpeg";
  intrinsicPx: { width: number; height: number };
}): PrintJobPayloadV1 {
  return {
    schema: "editor-maestro.print-job/v1",
    createdAtIso: new Date().toISOString(),
    documentTitle: args.document.meta.title,
    artboardLogicalPx: {
      width: args.document.canvas.width,
      height: args.document.canvas.height,
    },
    exportScale: args.scale,
    bleedMm: args.bleedMm,
    pdfRgb: {
      pageSizePt: args.pageSizePt,
      contentBoxPt: args.contentBoxPt,
      contentOriginPt: args.contentOriginPt,
    },
    color: {
      embedded: "sRGB",
      requestedPipeline: "await-backend-cmyk-conversion",
    },
    raster: {
      encoding: args.rasterEncoding,
      intrinsicPx: args.intrinsicPx,
    },
  };
}
```

---
## FILE: src\features\editor\export\ui\ExportModal.tsx

```
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Canvas } from "fabric";

import { useEditorStore } from "../../store/editor-store";
import {
  DEFAULT_EXPORT_FORM,
  type ExportFormState,
  type ExportFormatKind,
} from "../export-types";
import { executeExportDownload } from "../services/export-service";

import { ExportSettings } from "./ExportSettings";
import { FormatSelector } from "./FormatSelector";

export type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  getCanvas: () => Canvas | null;
};

export function ExportModal({ open, onClose, getCanvas }: ExportModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const document = useEditorStore((s) => s.present);

  const [form, setForm] = useState<ExportFormState>(DEFAULT_EXPORT_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchForm = useCallback((partial: Partial<ExportFormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const setFormat = useCallback((next: ExportFormatKind) => {
    setForm((prev) => {
      const base = { ...prev, format: next };
      if (next === "pdf-print" && prev.bleedMm <= 0) {
        return { ...base, bleedMm: 3 };
      }
      if (next !== "pdf-print") {
        return {
          ...base,
          requestServerCmykPdf: false,
          drawPrintCropMarks: false,
        };
      }
      return base;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>('button[role="radio"]')
        ?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const onDownload = async () => {
    const canvas = getCanvas();
    if (!canvas) {
      setError("El canvas no está listo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await executeExportDownload({ canvas, document, form });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Exportar diseño
            </h2>
            <p
              id={descId}
              className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
            >
              {document.meta.title || "Sin título"} · {document.canvas.width}×
              {document.canvas.height}px
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Formato
            </h3>
            <div className="mt-2">
              <FormatSelector
                value={form.format}
                disabled={busy}
                onChange={setFormat}
              />
            </div>
          </section>

          <div className="mt-6">
            <ExportSettings form={form} disabled={busy} onChange={patchForm} />
          </div>

          {error ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 bg-zinc-50/90 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/80">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-white disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
            onClick={() => void onDownload()}
          >
            {busy ? "Generando…" : "Descargar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
```

---
## FILE: src\features\editor\export\ui\ExportSettings.tsx

```
"use client";

import {
  EXPORT_SCALE_PRESETS,
  type ExportFormState,
  type ExportFormatKind,
} from "../export-types";

type ExportSettingsProps = {
  form: ExportFormState;
  onChange: (patch: Partial<ExportFormState>) => void;
  disabled?: boolean;
};

export function ExportSettings({ form, onChange, disabled }: ExportSettingsProps) {
  return (
    <div className="space-y-5 border-t border-zinc-200 pt-5 dark:border-zinc-700">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Calidad / tamaño
        </legend>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Escala respecto al lienzo lógico (1× = tamaño del documento, 4× = cuatro
          veces más píxeles por lado).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPORT_SCALE_PRESETS.map((n) => {
            const active = form.scale === n;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                className={[
                  "min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-medium transition",
                  active
                    ? "border-sky-500 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500",
                  disabled ? "opacity-50" : "",
                ].join(" ")}
                onClick={() => onChange({ scale: n })}
              >
                {n}×
              </button>
            );
          })}
        </div>
      </fieldset>

      <FormatSpecificBlock format={form.format} form={form} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function FormatSpecificBlock(props: {
  format: ExportFormatKind;
  form: ExportFormState;
  onChange: (patch: Partial<ExportFormState>) => void;
  disabled?: boolean;
}) {
  const { format, form, onChange, disabled } = props;

  if (format === "png") {
    return (
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          PNG
        </legend>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600"
            checked={form.pngPreserveTransparency}
            disabled={disabled}
            onChange={(e) =>
              onChange({ pngPreserveTransparency: e.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Conservar transparencia
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              Si está desactivado, el canal alpha se rellena con el color de fondo
              del documento.
            </span>
          </span>
        </label>
      </fieldset>
    );
  }

  if (format === "jpeg") {
    return (
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          JPEG
        </legend>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
            <span>Calidad</span>
            <span className="font-mono tabular-nums">
              {Math.round(form.jpegQuality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.85}
            max={1}
            step={0.01}
            disabled={disabled}
            value={form.jpegQuality}
            className="h-2 w-full cursor-pointer accent-sky-600 disabled:opacity-50"
            onChange={(e) =>
              onChange({ jpegQuality: Number.parseFloat(e.target.value) })
            }
          />
        </div>
      </fieldset>
    );
  }

  if (format === "pdf-rgb" || format === "pdf-print") {
    return (
      <>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            PDF — raster embebido
          </legend>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            PNG sin pérdida dentro del PDF (más peso) o JPEG de alta calidad.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="radio"
                name="pdf-raster"
                className="h-4 w-4 border-zinc-300 text-sky-600"
                checked={form.pdfRasterEncoding === "png-lossless"}
                disabled={disabled}
                onChange={() => onChange({ pdfRasterEncoding: "png-lossless" })}
              />
              PNG (sin pérdida)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="radio"
                name="pdf-raster"
                className="h-4 w-4 border-zinc-300 text-sky-600"
                checked={form.pdfRasterEncoding === "jpeg-high"}
                disabled={disabled}
                onChange={() => onChange({ pdfRasterEncoding: "jpeg-high" })}
              />
              JPEG (alta calidad)
            </label>
          </div>
        </fieldset>

        {(format === "pdf-rgb" && form.pdfRasterEncoding === "jpeg-high") ||
        (format === "pdf-print" && form.pdfRasterEncoding === "jpeg-high") ? (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Calidad JPEG en PDF
            </legend>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                <span>Calidad</span>
                <span className="font-mono tabular-nums">
                  {Math.round(form.jpegQuality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.88}
                max={1}
                step={0.01}
                disabled={disabled}
                value={form.jpegQuality}
                className="h-2 w-full cursor-pointer accent-sky-600 disabled:opacity-50"
                onChange={(e) =>
                  onChange({ jpegQuality: Number.parseFloat(e.target.value) })
                }
              />
            </div>
          </fieldset>
        ) : null}

        {format === "pdf-print" ? (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Prensa
            </legend>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Sangrado alrededor del cajón lógico. Se descarga un PDF RGB de
              referencia + JSON de medidas; opcionalmente un PDF CMYK generado
              en servidor (sharp + pdfkit, 300 dpi).
            </p>
            <div className="mt-2 flex items-center gap-3">
              <label className="text-sm text-zinc-700 dark:text-zinc-300">
                Sangrado (mm)
              </label>
              <input
                type="number"
                min={0}
                max={12}
                step={0.5}
                disabled={disabled}
                value={form.bleedMm}
                className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value);
                  if (Number.isFinite(v)) {
                    onChange({ bleedMm: Math.min(12, Math.max(0, v)) });
                  }
                }}
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600"
                checked={form.requestServerCmykPdf}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ requestServerCmykPdf: e.target.checked })
                }
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  PDF CMYK en servidor
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Requiere sesión. Convierte el mismo raster a CMYK (JPEG) y
                  compone PDF con sangrado. Perfiles ICC: preparar variables de
                  entorno en el host (ver comentarios en la ruta API).
                </span>
              </span>
            </label>
            <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600"
                checked={form.drawPrintCropMarks}
                disabled={disabled || !form.requestServerCmykPdf}
                onChange={(e) =>
                  onChange({ drawPrintCropMarks: e.target.checked })
                }
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Marcas de corte (PDF CMYK)
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Trazos finos en la zona de sangrado alrededor del cajón.
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}
      </>
    );
  }

  return null;
}
```

---
## FILE: src\features\editor\export\ui\FormatSelector.tsx

```
"use client";

import type { ExportFormatKind } from "../export-types";

const FORMATS: ReadonlyArray<{
  id: ExportFormatKind;
  label: string;
  description: string;
}> = [
  {
    id: "png",
    label: "PNG",
    description: "Ideal para web y capas. Transparencia opcional.",
  },
  {
    id: "jpeg",
    label: "JPG",
    description: "Archivo más liviano, sin canal alpha.",
  },
  {
    id: "pdf-rgb",
    label: "PDF estándar",
    description: "RGB para pantalla y compartir.",
  },
  {
    id: "pdf-print",
    label: "PDF impresión",
    description: "Sangrado + manifiesto JSON para CMYK en backend.",
  },
];

type FormatSelectorProps = {
  value: ExportFormatKind;
  onChange: (next: ExportFormatKind) => void;
  disabled?: boolean;
};

export function FormatSelector({
  value,
  onChange,
  disabled,
}: FormatSelectorProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="radiogroup"
      aria-label="Formato de exportación"
    >
      {FORMATS.map((f) => {
        const selected = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={[
              "flex flex-col rounded-xl border px-3 py-3 text-left text-sm transition",
              selected
                ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/40"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
            onClick={() => onChange(f.id)}
          >
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {f.label}
            </span>
            <span className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {f.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

---
## FILE: src\features\editor\export\ui\index.ts

```
export { ExportModal } from "./ExportModal";
export type { ExportModalProps } from "./ExportModal";
export { ExportSettings } from "./ExportSettings";
export { FormatSelector } from "./FormatSelector";
```

---
## FILE: src\features\editor\export\worker\export-decode.worker.ts

```
/// <reference lib="webworker" />

type InMsg = { id: number; b64: string };
type OutOk = { id: number; buffer: ArrayBuffer };
type OutErr = { id: number; error: string };

/**
 * Decodifica base64 → Uint8Array fuera del hilo UI (payloads grandes de export).
 */
self.onmessage = (ev: MessageEvent<InMsg>) => {
  const { id, b64 } = ev.data;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const msg: OutOk = { id, buffer: ab };
    (self as DedicatedWorkerGlobalScope).postMessage(msg, [ab]);
  } catch (e) {
    const msg: OutErr = {
      id,
      error: e instanceof Error ? e.message : "decode_error",
    };
    (self as DedicatedWorkerGlobalScope).postMessage(msg);
  }
};

export {};
```

---
## FILE: src\features\editor\fonts\google-font-loader.ts

```
const loadedFamilies = new Set<string>();

function linkId(family: string): string {
  return `gf-${family.replace(/\s+/g, "-")}`;
}

/**
 * Carga una familia de Google Fonts (CSS en `<head>`). Idempotente.
 */
export function loadGoogleFontFamily(family: string): Promise<void> {
  const trimmed = family.trim();
  if (!trimmed) return Promise.resolve();
  if (loadedFamilies.has(trimmed)) return Promise.resolve();
  if (typeof document === "undefined") return Promise.resolve();

  const id = linkId(trimmed);
  if (document.getElementById(id)) {
    loadedFamilies.add(trimmed);
    return Promise.resolve();
  }

  const familyParam = encodeURIComponent(trimmed).replace(/%20/g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@300;400;500;600;700&display=swap`;

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      loadedFamilies.add(trimmed);
      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => resolve());
      } else {
        resolve();
      }
    };
    link.onerror = () =>
      reject(new Error(`No se pudo cargar la fuente: ${trimmed}`));
    document.head.appendChild(link);
  });
}
```

---
## FILE: src\features\editor\fonts\google-fonts-catalog.ts

```
/**
 * Familias disponibles en el editor (Google Fonts).
 * Debe coincidir con lo que cargamos en {@link loadGoogleFontFamily}.
 */
export const GOOGLE_FONT_OPTIONS = [
  { family: "Inter", label: "Inter" },
  { family: "Roboto", label: "Roboto" },
  { family: "Open Sans", label: "Open Sans" },
  { family: "Lato", label: "Lato" },
  { family: "Montserrat", label: "Montserrat" },
  { family: "Oswald", label: "Oswald" },
  { family: "Playfair Display", label: "Playfair Display" },
  { family: "Merriweather", label: "Merriweather" },
  { family: "Poppins", label: "Poppins" },
  { family: "Raleway", label: "Raleway" },
  { family: "Nunito", label: "Nunito" },
  { family: "Source Sans 3", label: "Source Sans 3" },
  { family: "Work Sans", label: "Work Sans" },
  { family: "Noto Sans", label: "Noto Sans" },
  { family: "DM Sans", label: "DM Sans" },
] as const;

export const GOOGLE_FONT_CANONICAL_NAMES: ReadonlySet<string> = new Set(
  GOOGLE_FONT_OPTIONS.map((o) => o.family),
);
```

---
## FILE: src\features\editor\hooks\use-fabric-canvas-events.ts

```
"use client";

import type { MutableRefObject } from "react";
import { useEffect } from "react";
import type { Canvas, FabricObject, ModifiedEvent, TPointerEvent } from "fabric";
import { FabricImage, IText } from "fabric";

import { expandFabricEventTargets, mergeFabricObjectIntoElement } from "../canvas/fabric-to-model";
import { getFabricElementId } from "../canvas/fabric-element-id";
import type { PresentUpdateMode } from "../store/editor-store";
import { useEditorStore } from "../store/editor-store";
import { updateElementInDocument } from "../store/document-mutations";
import { scheduleFabricRender } from "../canvas/fabric-render-schedule";
import { pickUniformImageScale } from "../canvas/image-transform";

type FabricCanvasEventsOptions = {
  getCanvas: () => Canvas | null;
  reconcileGuardRef: MutableRefObject<boolean>;
  suppressSelectionEventsRef: MutableRefObject<boolean>;
};

function resolvePresentModeForFabricObject(
  target: FabricObject,
): PresentUpdateMode {
  if (target instanceof IText && target.isEditing) {
    return "transient";
  }
  return "commit";
}

export function useFabricCanvasEvents({
  getCanvas,
  reconcileGuardRef,
  suppressSelectionEventsRef,
}: FabricCanvasEventsOptions) {
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const persistTargets = (target: FabricObject | undefined) => {
      if (!target || reconcileGuardRef.current) return;
      const state = useEditorStore.getState();
      const targets = expandFabricEventTargets(target);
      let doc = state.present;
      let transientOk = true;
      let updates = 0;

      for (const t of targets) {
        const id = getFabricElementId(t);
        if (!id) continue;
        const elModel = doc.canvas.elements.find((e) => e.id === id);
        if (!elModel) continue;
        if (resolvePresentModeForFabricObject(t) !== "transient") {
          transientOk = false;
        }
        doc = updateElementInDocument(
          doc,
          id,
          mergeFabricObjectIntoElement(elModel, t),
        );
        updates += 1;
      }

      if (updates === 0) return;

      const mode: PresentUpdateMode = transientOk ? "transient" : "commit";

      state.markFabricMutationStart();
      state.replacePresent(doc, mode);
    };

    const onObjectModified = (opt: ModifiedEvent<TPointerEvent>) => {
      persistTargets(opt.target);
    };

    const onObjectScaling = (opt: { target?: FabricObject }) => {
      if (reconcileGuardRef.current) return;
      const t = opt.target;
      if (!(t instanceof FabricImage)) return;
      const id = getFabricElementId(t);
      if (!id) return;
      const state = useEditorStore.getState();
      const el = state.present.canvas.elements.find((e) => e.id === id);
      if (!el || el.type !== "image" || el.lockAspectRatio === false) return;
      const sx = t.scaleX ?? 1;
      const sy = t.scaleY ?? 1;
      if (Math.abs(sx - sy) < 1e-5) return;
      const u = pickUniformImageScale(sx, sy);
      t.set({ scaleX: u, scaleY: u });
      t.setCoords();
      scheduleFabricRender(canvas);
    };

    const onObjectMoving = () => {
      if (reconcileGuardRef.current) return;
      scheduleFabricRender(canvas);
    };

    const onTextChanged = (opt: { target?: FabricObject }) => {
      const t = opt.target;
      if (!(t instanceof IText)) return;
      persistTargets(t);
    };

    const onTextEditingEntered = (opt: { target?: FabricObject }) => {
      if (!(opt.target instanceof IText)) return;
      useEditorStore.getState().pushHistoryAnchor();
    };

    const onSelection = (selected: FabricObject[]) => {
      if (suppressSelectionEventsRef.current) return;
      const ids = selected
        .map((o) => getFabricElementId(o))
        .filter((x): x is string => Boolean(x));
      useEditorStore.getState().select(ids);
    };

    const onSelectionCreated = (e: { selected?: FabricObject[] }) =>
      onSelection(e.selected ?? []);
    const onSelectionUpdated = (e: { selected?: FabricObject[] }) =>
      onSelection(e.selected ?? []);

    canvas.on("object:modified", onObjectModified);
    canvas.on("object:scaling", onObjectScaling);
    canvas.on("text:changed", onTextChanged);
    canvas.on("text:editing:entered", onTextEditingEntered);
    canvas.on("selection:created", onSelectionCreated);
    canvas.on("selection:updated", onSelectionUpdated);

    const onSelectionCleared = () => {
      if (suppressSelectionEventsRef.current) return;
      useEditorStore.getState().clearSelection();
    };

    canvas.on("selection:cleared", onSelectionCleared);
    canvas.on("object:moving", onObjectMoving);

    return () => {
      canvas.off("object:modified", onObjectModified);
      canvas.off("object:scaling", onObjectScaling);
      canvas.off("text:changed", onTextChanged);
      canvas.off("text:editing:entered", onTextEditingEntered);
      canvas.off("selection:created", onSelectionCreated);
      canvas.off("selection:updated", onSelectionUpdated);
      canvas.off("selection:cleared", onSelectionCleared);
      canvas.off("object:moving", onObjectMoving);
    };
  }, [getCanvas, reconcileGuardRef, suppressSelectionEventsRef]);
}
```

---
## FILE: src\features\editor\hooks\use-fabric-canvas-instance.ts

```
"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { Canvas } from "fabric";

import { reconcileFabricWithDocument } from "../canvas/canvas-reconciler";
import { disposeCanvas } from "../canvas/object-factory";
import { useEditorStore } from "../store/editor-store";

export type FabricReconcileGuardRef = MutableRefObject<boolean>;

export function useFabricCanvasInstance(
  reconcileGuardRef: FabricReconcileGuardRef,
  onReady?: (canvas: Canvas) => void,
) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const reconcileGenRef = useRef(0);

  const getCanvas = useCallback(() => fabricRef.current, []);

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    const initial = useEditorStore.getState().present;
    const canvas = new Canvas(el, {
      width: initial.canvas.width,
      height: initial.canvas.height,
      backgroundColor: initial.canvas.backgroundColor,
      preserveObjectStacking: true,
      uniformScaling: true,
    });
    const ctx2d = canvas.lowerCanvasEl?.getContext("2d");
    if (ctx2d) {
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = "high";
    }
    fabricRef.current = canvas;
    onReady?.(canvas);

    const myGen = ++reconcileGenRef.current;
    reconcileGuardRef.current = true;
    void reconcileFabricWithDocument(canvas, initial, {
      isCancelled: () => myGen !== reconcileGenRef.current,
    }).finally(() => {
      if (myGen === reconcileGenRef.current) {
        reconcileGuardRef.current = false;
      }
    });

    return () => {
      reconcileGenRef.current += 1;
      disposeCanvas(canvas);
      fabricRef.current = null;
    };
  }, [onReady, reconcileGuardRef]);

  return { canvasElRef, fabricRef, getCanvas };
}
```

---
## FILE: src\features\editor\hooks\use-fabric-document-reconcile.ts

```
"use client";

import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";

import { reconcileFabricWithDocument } from "../canvas/canvas-reconciler";
import type { FabricReconcileGuardRef } from "./use-fabric-canvas-instance";
import { useEditorStore } from "../store/editor-store";

export function useFabricDocumentReconcile(
  getCanvas: () => Canvas | null,
  reconcileGuardRef: FabricReconcileGuardRef,
) {
  const genRef = useRef(0);

  useEffect(() => {
    return useEditorStore.subscribe(
      (s) => s.present,
      (doc) => {
        const canvas = getCanvas();
        if (!canvas) return;
        if (useEditorStore.getState().consumeFabricResyncSkip()) return;

        const my = ++genRef.current;
        reconcileGuardRef.current = true;
        void reconcileFabricWithDocument(canvas, doc, {
          isCancelled: () => my !== genRef.current,
        }).finally(() => {
          if (my === genRef.current) reconcileGuardRef.current = false;
        });
      },
    );
  }, [getCanvas, reconcileGuardRef]);
}
```

---
## FILE: src\features\editor\hooks\use-fabric-store-selection-sync.ts

```
"use client";

import type { MutableRefObject } from "react";
import { useEffect } from "react";
import type { Canvas } from "fabric";

import { applyStoreSelectionToFabricCanvas } from "../canvas/fabric-selection";
import { useEditorStore } from "../store/editor-store";

export function useFabricStoreSelectionSync(
  getCanvas: () => Canvas | null,
  suppressSelectionEventsRef: MutableRefObject<boolean>,
) {
  useEffect(() => {
    return useEditorStore.subscribe(
      (s) => s.selectedIds,
      (ids) => {
        applyStoreSelectionToFabricCanvas(
          getCanvas(),
          ids,
          suppressSelectionEventsRef,
        );
      },
      {
        equalityFn: (a, b) =>
          a.length === b.length && a.every((id, i) => id === b[i]),
        fireImmediately: true,
      },
    );
  }, [getCanvas, suppressSelectionEventsRef]);
}
```

---
## FILE: src\features\editor\layers\layers-panel.tsx

```
"use client";

import { useEditorStore } from "../store/editor-store";
import { isTextElement } from "@/entities/editor/element-guards";

export function LayersPanel() {
  const elements = useEditorStore((s) => s.present.canvas.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Capas
      </h2>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {[...elements].reverse().map((el, idx) => {
          const label = isTextElement(el)
            ? el.text.slice(0, 28) + (el.text.length > 28 ? "…" : "")
            : "Imagen";
          const selected = selectedIds.includes(el.id);
          return (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => useEditorStore.getState().select([el.id])}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  selected
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-xs text-zinc-400">{elements.length - idx}.</span>{" "}
                {label || "(vacío)"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

---
## FILE: src\features\editor\magic-erase\geometry.ts

```
import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

export function intersectSceneRects(
  a: InpaintSceneRect,
  b: InpaintSceneRect,
): InpaintSceneRect | null {
  const ax2 = a.left + a.width;
  const ay2 = a.top + a.height;
  const bx2 = b.left + b.width;
  const by2 = b.top + b.height;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(ax2, bx2);
  const bottom = Math.min(ay2, by2);
  const width = right - left;
  const height = bottom - top;
  if (width <= 1 || height <= 1) return null;
  return { left, top, width, height };
}

export function sceneRectFromTwoPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
): InpaintSceneRect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  return { left, top, width, height };
}
```

---
## FILE: src\features\editor\magic-erase\inpaint-api-client.ts

```
export type InpaintApiRequestBody = {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
};

export type InpaintApiResponseBody = {
  outputUrl: string;
  requestId?: string;
};

function humanMessageForCode(code: string | undefined, status: number): string {
  switch (code) {
    case "unauthorized":
      return "Tenés que iniciar sesión para usar el borrador mágico.";
    case "rate_limit":
      return "Demasiadas solicitudes. Probá de nuevo en unos segundos.";
    case "too_many_concurrent_requests":
      return "Ya hay un inpainting en curso. Esperá a que termine.";
    case "payload_too_large":
      return "Las imágenes son demasiado grandes para el servidor (límite de cuerpo).";
    case "content_length_required":
      return "El cliente no envió Content-Length; actualizá la app o contactá soporte.";
    case "dimensions_exceed_limit":
      return "La imagen supera el tamaño máximo permitido (2048 px por lado).";
    case "image_mask_dimension_mismatch":
      return "Imagen y máscara deben tener el mismo tamaño en píxeles.";
    case "provider_unavailable":
      return "El proveedor de IA no está disponible. Reintentá más tarde.";
    case "inpaint_not_configured":
      return "El servidor no tiene configurado Replicate.";
    case "auth_backend_unavailable":
    case "auth_backend_error":
      return "Autenticación no disponible en el servidor.";
    case "invalid_json":
      return "El servidor no pudo interpretar la solicitud.";
    case "upstream_timeout":
      return "La descarga de la imagen tardó demasiado. Reintentá.";
    default:
      return status === 429
        ? "Límite de uso alcanzado."
        : `Error del servidor (${status}).`;
  }
}

export async function requestInpaintFromApi(
  body: InpaintApiRequestBody,
): Promise<InpaintApiResponseBody> {
  const payload = JSON.stringify(body);
  const res = await fetch("/api/inpaint", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  const json = (await res.json()) as InpaintApiResponseBody & {
    error?: string;
    requestId?: string;
    retryAfterMs?: number;
  };
  if (!res.ok) {
    const msg = humanMessageForCode(json.error, res.status);
    throw new Error(msg);
  }
  if (!json.outputUrl) {
    throw new Error("Respuesta sin outputUrl");
  }
  return json;
}
```

---
## FILE: src\features\editor\magic-erase\magic-erase-panel.tsx

```
"use client";

import { useCallback, useState } from "react";
import type { Canvas } from "fabric";
import { FabricImage } from "fabric";

import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

import { findFabricObjectByElementId } from "../canvas/fabric-element-id";
import { useEditorStore } from "../store/editor-store";

import { useMagicEraseStore } from "./magic-erase-store";
import { runMagicEraseForSelectedImage } from "./run-magic-erase";
import { useMagicEraseRectCapture } from "./use-magic-erase-rect-capture";

type MagicErasePanelProps = {
  getCanvas: () => Canvas | null;
};

export function MagicErasePanel({ getCanvas }: MagicErasePanelProps) {
  const mode = useMagicEraseStore((s) => s.mode);
  const prompt = useMagicEraseStore((s) => s.prompt);
  const setPrompt = useMagicEraseStore((s) => s.setPrompt);
  const startSelectRect = useMagicEraseStore((s) => s.startSelectRect);
  const stop = useMagicEraseStore((s) => s.stop);

  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedElement = useEditorStore((s) => {
    const id = s.selectedIds[0];
    return id
      ? s.present.canvas.elements.find((e) => e.id === id)
      : undefined;
  });

  const [busy, setBusy] = useState(false);

  const selectedIsImage =
    selectedIds.length === 1 && selectedElement?.type === "image";

  const onRect = useCallback(
    async (sceneRect: InpaintSceneRect) => {
      stop();
      const state = useEditorStore.getState();
      const id = state.selectedIds[0];
      if (!id) {
        window.alert("Seleccioná una imagen en el canvas.");
        return;
      }
      const model = state.present.canvas.elements.find((e) => e.id === id);
      if (!model || model.type !== "image") {
        window.alert("El borrador mágico solo aplica a imágenes.");
        return;
      }
      const canvas = getCanvas();
      if (!canvas) return;
      const obj = findFabricObjectByElementId(canvas, id);
      if (!(obj instanceof FabricImage)) {
        window.alert("No se encontró el objeto Fabric de la imagen.");
        return;
      }

      setBusy(true);
      try {
        const { dataUrl, width, height } = await runMagicEraseForSelectedImage({
          fabricImage: obj,
          model,
          sceneRect,
          prompt: useMagicEraseStore.getState().prompt.trim() || undefined,
        });
        useEditorStore.getState().updateElement(
          id,
          {
            src: dataUrl,
            naturalWidth: width,
            naturalHeight: height,
          },
          { recordHistory: true },
        );
      } catch (e) {
        console.error(e);
        window.alert(
          e instanceof Error ? e.message : "Falló el inpainting remoto.",
        );
      } finally {
        setBusy(false);
      }
    },
    [getCanvas, stop],
  );

  useMagicEraseRectCapture({
    getCanvas,
    active: mode === "select_rect",
    onRect,
  });

  const canArm =
    selectedIsImage && !busy && mode === "off";

  return (
    <section className="border-b border-zinc-200 p-4 dark:border-zinc-700">
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Borrador mágico (IA)
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Replicate (SD Inpainting): dibujá un rectángulo sobre la imagen
        seleccionada. La máscara marca en blanco la zona a reconstruir.
      </p>
      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="text-zinc-600 dark:text-zinc-300">Prompt (opcional)</span>
        <textarea
          value={prompt}
          rows={2}
          disabled={busy}
          placeholder="p. ej. fondo limpio, sin objeto"
          className="resize-none rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "off" ? (
          <button
            type="button"
            disabled={!canArm}
            title={
              !selectedIsImage
                ? "Seleccioná una sola imagen en el canvas."
                : "Dibujá un rectángulo sobre la imagen."
            }
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-40"
            onClick={() => {
              if (!selectedIsImage) {
                window.alert("Seleccioná una imagen en el canvas.");
                return;
              }
              startSelectRect();
            }}
          >
            Seleccionar zona
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600"
            onClick={() => stop()}
          >
            Cancelar selección
          </button>
        )}
      </div>
      {mode === "select_rect" ? (
        <p className="mt-2 text-xs text-sky-700 dark:text-sky-300">
          Arrastrá un rectángulo sobre la imagen. Al soltar se envía a la API.
        </p>
      ) : null}
      {busy ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Procesando con Replicate…
        </p>
      ) : null}
    </section>
  );
}
```

---
## FILE: src\features\editor\magic-erase\magic-erase-store.ts

```
import { create } from "zustand";

export type MagicEraseMode = "off" | "select_rect";

type MagicEraseState = {
  mode: MagicEraseMode;
  prompt: string;
  setPrompt: (v: string) => void;
  startSelectRect: () => void;
  stop: () => void;
};

export const useMagicEraseStore = create<MagicEraseState>((set) => ({
  mode: "off",
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  startSelectRect: () => set({ mode: "select_rect" }),
  stop: () => set({ mode: "off" }),
}));
```

---
## FILE: src\features\editor\magic-erase\raster.ts

```
import type { ImageElement } from "@/entities/editor/document-schema";

import type { InpaintImagePixelROI } from "@/services/inpaint/inpaint-types";

export function buildBinaryMaskPngDataUrl(
  width: number,
  height: number,
  roi: InpaintImagePixelROI,
): string {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context no disponible");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(roi.x, roi.y, roi.w, roi.h);
  return c.toDataURL("image/png");
}

/** Rasteriza `element.src` al tamaño natural del modelo (una salida PNG). */
export function rasterizeImageElementToPngDataUrl(
  el: ImageElement,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = el.naturalWidth;
      const h = el.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        reject(new Error("2D context no disponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del elemento"));
    img.src = el.src;
  });
}

/**
 * URLs de entrega Replicate pasan por `/api/image-proxy` (cookies + allowlist)
 * para evitar CORS y no exponer descargas anónimas cross-origin.
 */
async function describeImageFetchFailure(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const j = (await res.json()) as { error?: string };
      switch (j.error) {
        case "unauthorized":
          return "Tenés que iniciar sesión para cargar la imagen del resultado.";
        case "rate_limit":
          return "Demasiadas descargas de imágenes. Esperá unos segundos.";
        case "too_many_concurrent_requests":
          return "Hay demasiadas descargas en paralelo. Esperá a que terminen.";
        case "upstream_timeout":
        case "upstream_error":
        case "upstream_fetch_failed":
          return "No se pudo obtener la imagen desde el proveedor. Reintentá.";
        case "upstream_too_large":
          return "La imagen devuelta es demasiado grande.";
        case "forbidden_host":
          return "URL de imagen no permitida.";
        default:
          break;
      }
    } catch {
      /* ignorar JSON inválido */
    }
  }
  return `Descarga fallida (${res.status})`;
}

export function resolveImageFetchUrlForClient(url: string): {
  url: string;
  credentials: RequestCredentials;
} {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h === "replicate.delivery" || h.endsWith(".replicate.delivery")) {
      return {
        url: `/api/image-proxy?url=${encodeURIComponent(url)}`,
        credentials: "include",
      };
    }
  } catch {
    /* URL inválida: fetch fallará con mensaje claro */
  }
  return { url, credentials: "omit" };
}

export async function fetchHttpsToPngDataUrl(url: string): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const { url: target, credentials } = resolveImageFetchUrlForClient(url);
  const res = await fetch(target, { credentials });
  if (!res.ok) {
    const msg = await describeImageFetchFailure(res);
    throw new Error(msg);
  }
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const width = bmp.width;
  const height = bmp.height;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context no disponible");
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return {
    dataUrl: c.toDataURL("image/png"),
    width,
    height,
  };
}
```

---
## FILE: src\features\editor\magic-erase\run-magic-erase.ts

```
"use client";

import type { FabricImage } from "fabric";

import type { ImageElement } from "@/entities/editor/document-schema";
import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

import { intersectSceneRects } from "./geometry";
import { requestInpaintFromApi } from "./inpaint-api-client";
import {
  buildBinaryMaskPngDataUrl,
  fetchHttpsToPngDataUrl,
  rasterizeImageElementToPngDataUrl,
} from "./raster";
import { sceneRectToImagePixelRoi } from "./scene-rect-to-image-roi";

export async function runMagicEraseForSelectedImage(args: {
  fabricImage: FabricImage;
  model: ImageElement;
  sceneRect: InpaintSceneRect;
  prompt?: string;
}): Promise<{ dataUrl: string; width: number; height: number }> {
  const { fabricImage, model, sceneRect, prompt } = args;

  const bounds = fabricImage.getBoundingRect();
  const inter = intersectSceneRects(sceneRect, bounds);
  if (!inter) {
    throw new Error("La selección no intersecta la imagen.");
  }

  const nw = model.naturalWidth;
  const nh = model.naturalHeight;
  const roi = sceneRectToImagePixelRoi(fabricImage, inter, nw, nh);

  const imageDataUrl = await rasterizeImageElementToPngDataUrl(model);
  const maskDataUrl = buildBinaryMaskPngDataUrl(nw, nh, roi);

  const { outputUrl } = await requestInpaintFromApi({
    imageDataUrl,
    maskDataUrl,
    prompt,
  });

  return fetchHttpsToPngDataUrl(outputUrl);
}
```

---
## FILE: src\features\editor\magic-erase\scene-rect-to-image-roi.ts

```
import type { FabricImage } from "fabric";
import { Point, util } from "fabric";

import type {
  InpaintImagePixelROI,
  InpaintSceneRect,
} from "@/services/inpaint/inpaint-types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convierte un rectángulo en espacio de escena (canvas) a un ROI en píxeles
 * del bitmap de la imagen, usando la matriz de transformación del `FabricImage`.
 */
export function sceneRectToImagePixelRoi(
  img: FabricImage,
  sceneRect: InpaintSceneRect,
  naturalW: number,
  naturalH: number,
): InpaintImagePixelROI {
  const inv = util.invertTransform(img.calcTransformMatrix(true));
  const corners = [
    new Point(sceneRect.left, sceneRect.top),
    new Point(sceneRect.left + sceneRect.width, sceneRect.top),
    new Point(sceneRect.left + sceneRect.width, sceneRect.top + sceneRect.height),
    new Point(sceneRect.left, sceneRect.top + sceneRect.height),
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of corners) {
    const q = util.transformPoint(p, inv);
    minX = Math.min(minX, q.x);
    minY = Math.min(minY, q.y);
    maxX = Math.max(maxX, q.x);
    maxY = Math.max(maxY, q.y);
  }

  const x0 = clamp(Math.floor(minX), 0, Math.max(0, naturalW - 1));
  const y0 = clamp(Math.floor(minY), 0, Math.max(0, naturalH - 1));
  const x1 = clamp(Math.ceil(maxX), 0, naturalW);
  const y1 = clamp(Math.ceil(maxY), 0, naturalH);
  const w = clamp(x1 - x0, 1, naturalW - x0);
  const h = clamp(y1 - y0, 1, naturalH - y0);
  return { x: x0, y: y0, w, h };
}
```

---
## FILE: src\features\editor\magic-erase\use-magic-erase-rect-capture.ts

```
"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { Canvas } from "fabric";
import { Rect } from "fabric";

import type { InpaintSceneRect } from "@/services/inpaint/inpaint-types";

import { sceneRectFromTwoPoints } from "./geometry";

type DragState = {
  start: { x: number; y: number };
  preview: Rect | null;
};

type Options = {
  getCanvas: () => Canvas | null;
  /** Cuando es true, el canvas ignora objetos y captura el rectángulo en escena. */
  active: boolean;
  onRect: (rect: InpaintSceneRect) => void;
  /** Mínimo lado en unidades de escena para aceptar el trazo. */
  minDragPx?: number;
};

/**
 * Captura un rectángulo en coordenadas de escena (drag en el lienzo).
 * Dibuja un preview temporal (sin `__editorElementId`, el reconciler no lo borra).
 */
export function useMagicEraseRectCapture({
  getCanvas,
  active,
  onRect,
  minDragPx = 6,
}: Options) {
  const dragRef = useRef<DragState | null>(null);
  const prevSkipRef = useRef<boolean | null>(null);
  const prevSelectionRef = useRef<boolean | null>(null);
  const onRectRef = useRef(onRect);
  useLayoutEffect(() => {
    onRectRef.current = onRect;
  }, [onRect]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas || !active) {
      const c = getCanvas();
      if (c && prevSkipRef.current != null) {
        c.skipTargetFind = prevSkipRef.current;
        c.selection = prevSelectionRef.current ?? true;
        prevSkipRef.current = null;
        prevSelectionRef.current = null;
      }
      return;
    }

    prevSkipRef.current = canvas.skipTargetFind;
    prevSelectionRef.current = canvas.selection;
    canvas.skipTargetFind = true;
    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const ensurePreview = (): Rect => {
      let d = dragRef.current;
      if (!d) {
        d = { start: { x: 0, y: 0 }, preview: null };
        dragRef.current = d;
      }
      if (!d.preview) {
        const r = new Rect({
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          fill: "rgba(56, 189, 248, 0.22)",
          stroke: "#0ea5e9",
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        d.preview = r;
        canvas.add(r);
      }
      return d.preview;
    };

    const onDown = (opt: { e?: Event }) => {
      const e = opt.e as PointerEvent | undefined;
      if (!e) return;
      const p = canvas.getScenePoint(e);
      dragRef.current = { start: { x: p.x, y: p.y }, preview: null };
      const preview = ensurePreview();
      preview.set({ left: p.x, top: p.y, width: 0, height: 0, visible: true });
      preview.setCoords();
      canvas.requestRenderAll();
    };

    const onMove = (opt: { e?: Event }) => {
      const d = dragRef.current;
      if (!d?.start) return;
      const e = opt.e as PointerEvent | undefined;
      if (!e) return;
      const p = canvas.getScenePoint(e);
      const r = sceneRectFromTwoPoints(d.start, { x: p.x, y: p.y });
      const preview = ensurePreview();
      preview.set({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        visible: r.width > 0 && r.height > 0,
      });
      preview.setCoords();
      canvas.requestRenderAll();
    };

    const finish = (opt: { e?: Event }) => {
      const d = dragRef.current;
      if (!d?.start) return;
      const e = opt.e as PointerEvent | undefined;
      const end = e
        ? canvas.getScenePoint(e)
        : { x: d.start.x, y: d.start.y };
      const rect = sceneRectFromTwoPoints(d.start, end);
      if (d.preview) {
        canvas.remove(d.preview);
        d.preview = null;
      }
      dragRef.current = null;
      canvas.requestRenderAll();
      if (rect.width >= minDragPx && rect.height >= minDragPx) {
        onRectRef.current(rect);
      }
    };

    canvas.on("mouse:down", onDown);
    canvas.on("mouse:move", onMove);
    canvas.on("mouse:up", finish);

    return () => {
      canvas.off("mouse:down", onDown);
      canvas.off("mouse:move", onMove);
      canvas.off("mouse:up", finish);
      const d = dragRef.current;
      if (d?.preview) {
        canvas.remove(d.preview);
      }
      dragRef.current = null;
      canvas.skipTargetFind = prevSkipRef.current ?? false;
      canvas.selection = prevSelectionRef.current ?? true;
      prevSkipRef.current = null;
      prevSelectionRef.current = null;
      canvas.requestRenderAll();
    };
  }, [active, getCanvas, minDragPx]);
}
```

---
## FILE: src\features\editor\store\document-mutations.ts

```
import {
  EDITOR_DOCUMENT_VERSION,
  type CanvasElement,
  type EditorDocument,
  type ElementId,
  type ImageElement,
  type TextElement,
} from "@/entities/editor/document-schema";
import { createElementId } from "@/entities/editor/defaults";
import { isImageElement, isTextElement } from "@/entities/editor/element-guards";
import {
  createDefaultImageEffects,
  normalizeImageEffects,
} from "@/entities/editor/image-effects";
import {
  DEFAULT_EDITOR_TEXT_TYPOGRAPHY,
  normalizeTextElement,
} from "@/entities/editor/text-typography";

/** Copia profunda inmutable del documento (para historial / snapshots). */
export function cloneDocument(doc: EditorDocument): EditorDocument {
  return structuredClone(doc);
}

export function appendElementToDocument(
  doc: EditorDocument,
  element: CanvasElement,
): EditorDocument {
  return {
    ...doc,
    canvas: {
      ...doc.canvas,
      elements: [...doc.canvas.elements, element],
    },
  };
}

export function updateElementInDocument(
  doc: EditorDocument,
  id: ElementId,
  patch: Partial<CanvasElement>,
): EditorDocument {
  const elements = doc.canvas.elements.map((el) => {
    if (el.id !== id) return el;
    const merged = { ...el, ...patch } as CanvasElement;
    if (isTextElement(merged)) {
      return normalizeTextElement(merged);
    }
    if (isImageElement(merged)) {
      return normalizeImageElement(merged);
    }
    return merged;
  });
  return {
    ...doc,
    canvas: { ...doc.canvas, elements },
  };
}

export function removeElementFromDocument(
  doc: EditorDocument,
  id: ElementId,
): EditorDocument {
  return {
    ...doc,
    canvas: {
      ...doc.canvas,
      elements: doc.canvas.elements.filter((el) => el.id !== id),
    },
  };
}

export function createDefaultTextElement(doc: EditorDocument): TextElement {
  const id = createElementId();
  const raw: TextElement = {
    id,
    type: "text",
    locked: false,
    visible: true,
    opacity: 1,
    text: "Texto",
    ...DEFAULT_EDITOR_TEXT_TYPOGRAPHY,
    transform: {
      x: doc.canvas.width / 2 - 80,
      y: doc.canvas.height / 2 - 24,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      originX: "left",
      originY: "top",
    },
  };
  return normalizeTextElement(raw);
}

export function normalizeImageElement(el: ImageElement): ImageElement {
  return {
    ...el,
    lockAspectRatio: el.lockAspectRatio ?? true,
    effects: normalizeImageEffects(el.effects),
  };
}

function defaultElementTransform(): CanvasElement["transform"] {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    originX: "left",
    originY: "top",
  };
}

function normalizeElementTransform(raw: unknown): CanvasElement["transform"] {
  const d = defaultElementTransform();
  if (!raw || typeof raw !== "object") return d;
  const t = raw as Record<string, unknown>;
  const ox = t.originX;
  const oy = t.originY;
  return {
    x: typeof t.x === "number" ? t.x : d.x,
    y: typeof t.y === "number" ? t.y : d.y,
    rotation: typeof t.rotation === "number" ? t.rotation : d.rotation,
    scaleX: typeof t.scaleX === "number" ? t.scaleX : d.scaleX,
    scaleY: typeof t.scaleY === "number" ? t.scaleY : d.scaleY,
    originX:
      ox === "center" || ox === "right" || ox === "left" ? ox : d.originX,
    originY:
      oy === "center" || oy === "bottom" || oy === "top" ? oy : d.originY,
  };
}

/**
 * Reconstruye un {@link EditorDocument} desde JSON (p. ej. Supabase) con normalización de elementos.
 */
export function hydrateEditorDocument(
  raw: unknown,
  fallbackProjectId: string,
): EditorDocument {
  if (!raw || typeof raw !== "object") {
    throw new Error("Documento inválido: no es un objeto");
  }
  const o = raw as Record<string, unknown>;
  const canvasRaw = o.canvas;
  if (!canvasRaw || typeof canvasRaw !== "object") {
    throw new Error("Documento inválido: falta canvas");
  }
  const canvasObj = canvasRaw as Record<string, unknown>;
  const elementsRaw = canvasObj.elements;
  if (!Array.isArray(elementsRaw)) {
    throw new Error("Documento inválido: elements debe ser un array");
  }

  const projectId =
    typeof o.projectId === "string" && o.projectId.length > 0
      ? o.projectId
      : fallbackProjectId;

  const elements: CanvasElement[] = [];
  for (const item of elementsRaw) {
    if (!item || typeof item !== "object") continue;
    const t = (item as { type?: string }).type;

    if (t === "text") {
      const te = item as Partial<TextElement> & { type: "text" };
      elements.push(
        normalizeTextElement({
          ...te,
          id:
            typeof te.id === "string" && te.id.length > 0
              ? te.id
              : createElementId(),
          type: "text",
          locked: Boolean(te.locked),
          visible: te.visible !== false,
          opacity: typeof te.opacity === "number" ? te.opacity : 1,
          text: typeof te.text === "string" ? te.text : "Texto",
          transform: normalizeElementTransform(te.transform),
        } as TextElement),
      );
      continue;
    }

    if (t === "image") {
      const img = item as Partial<ImageElement> & { type: "image" };
      if (typeof img.src !== "string") continue;
      const full: ImageElement = {
        id:
          typeof img.id === "string" && img.id.length > 0
            ? img.id
            : createElementId(),
        type: "image",
        locked: Boolean(img.locked),
        visible: img.visible !== false,
        opacity: typeof img.opacity === "number" ? img.opacity : 1,
        src: img.src,
        naturalWidth:
          typeof img.naturalWidth === "number" && img.naturalWidth > 0
            ? img.naturalWidth
            : 1,
        naturalHeight:
          typeof img.naturalHeight === "number" && img.naturalHeight > 0
            ? img.naturalHeight
            : 1,
        lockAspectRatio: img.lockAspectRatio !== false,
        effects: normalizeImageEffects(img.effects),
        transform: normalizeElementTransform(img.transform),
        ...(img.crop &&
        typeof img.crop === "object" &&
        typeof (img.crop as { x?: unknown }).x === "number"
          ? { crop: img.crop as ImageElement["crop"] }
          : {}),
      };
      elements.push(normalizeImageElement(full));
    }
  }

  const metaRaw = o.meta;
  const meta =
    metaRaw && typeof metaRaw === "object"
      ? (metaRaw as EditorDocument["meta"])
      : { title: "Sin título", updatedAt: new Date().toISOString() };

  const canvas: EditorDocument["canvas"] = {
    width: typeof canvasObj.width === "number" ? canvasObj.width : 1080,
    height: typeof canvasObj.height === "number" ? canvasObj.height : 1350,
    backgroundColor:
      typeof canvasObj.backgroundColor === "string"
        ? canvasObj.backgroundColor
        : "#ffffff",
    ...(canvasObj.backgroundImage &&
    typeof canvasObj.backgroundImage === "object"
      ? {
          backgroundImage: canvasObj.backgroundImage as NonNullable<
            EditorDocument["canvas"]["backgroundImage"]
          >,
        }
      : {}),
    elements,
  };

  return {
    version: EDITOR_DOCUMENT_VERSION,
    projectId,
    canvas,
    meta: {
      title: typeof meta.title === "string" ? meta.title : "Sin título",
      updatedAt:
        typeof meta.updatedAt === "string"
          ? meta.updatedAt
          : new Date().toISOString(),
    },
  };
}

export function buildImageElement(
  doc: EditorDocument,
  input: { src: string; naturalWidth: number; naturalHeight: number },
): ImageElement {
  const id = createElementId();
  const maxW = doc.canvas.width * 0.72;
  const maxH = doc.canvas.height * 0.72;
  const scale = Math.min(
    maxW / input.naturalWidth,
    maxH / input.naturalHeight,
    1,
  );
  const displayW = input.naturalWidth * scale;
  const displayH = input.naturalHeight * scale;
  return {
    id,
    type: "image",
    locked: false,
    visible: true,
    opacity: 1,
    src: input.src,
    naturalWidth: input.naturalWidth,
    naturalHeight: input.naturalHeight,
    lockAspectRatio: true,
    effects: createDefaultImageEffects(),
    transform: {
      x: doc.canvas.width / 2 - displayW / 2,
      y: doc.canvas.height / 2 - displayH / 2,
      rotation: 0,
      scaleX: scale,
      scaleY: scale,
      originX: "left",
      originY: "top",
    },
  };
}

export function addImageElement(
  doc: EditorDocument,
  input: { src: string; naturalWidth: number; naturalHeight: number },
): EditorDocument {
  return appendElementToDocument(doc, buildImageElement(doc, input));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

function loadNaturalImageSize(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

export async function createImageElementFromFile(
  doc: EditorDocument,
  file: File,
): Promise<ImageElement> {
  const dataUrl = await readFileAsDataUrl(file);
  const { width, height } = await loadNaturalImageSize(dataUrl);
  return buildImageElement(doc, {
    src: dataUrl,
    naturalWidth: width,
    naturalHeight: height,
  });
}

export async function addImageElementFromFile(
  doc: EditorDocument,
  file: File,
): Promise<EditorDocument> {
  const el = await createImageElementFromFile(doc, file);
  return appendElementToDocument(doc, el);
}

export function addTextElement(doc: EditorDocument): EditorDocument {
  return appendElementToDocument(doc, createDefaultTextElement(doc));
}

export function applyFabricTransformToElement(
  el: CanvasElement,
  fabricLike: {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    originX: CanvasElement["transform"]["originX"];
    originY: CanvasElement["transform"]["originY"];
  },
): CanvasElement {
  return {
    ...el,
    transform: {
      x: fabricLike.left,
      y: fabricLike.top,
      rotation: fabricLike.angle,
      scaleX: fabricLike.scaleX,
      scaleY: fabricLike.scaleY,
      originX: fabricLike.originX,
      originY: fabricLike.originY,
    },
  };
}

export type FabricTextLike = {
  text?: string;
  fontSize?: number;
  fill?: string | object;
  fontFamily?: string;
  fontWeight?: number | string;
  textAlign?: string;
};

export function applyFabricTextProps(
  el: CanvasElement,
  fabricLike: FabricTextLike,
  inferFont?: (fabricCss: string) => Pick<TextElement, "fontSource" | "fontFamily">,
): CanvasElement {
  if (!isTextElement(el)) return el;
  let next: TextElement = { ...el };
  if (typeof fabricLike.text === "string") next.text = fabricLike.text;
  if (typeof fabricLike.fontSize === "number") next.fontSize = fabricLike.fontSize;
  if (typeof fabricLike.fill === "string") next.fill = fabricLike.fill;
  if (typeof fabricLike.fontWeight !== "undefined") {
    next.fontWeight = fabricLike.fontWeight as string | number;
  }
  if (typeof fabricLike.textAlign === "string") {
    const a = mapFabricTextAlignToModel(fabricLike.textAlign);
    if (a) next.textAlign = a;
  }
  if (typeof fabricLike.fontFamily === "string" && inferFont) {
    next = { ...next, ...inferFont(fabricLike.fontFamily) };
  }
  return next;
}

function mapFabricTextAlignToModel(
  align: string,
): TextElement["textAlign"] | null {
  if (align === "left" || align === "center" || align === "right") {
    return align;
  }
  if (align === "justify" || align === "justify-left" || align === "justify-center") {
    return "justify";
  }
  return null;
}
```

---
## FILE: src\features\editor\store\editor-store.ts

```
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { CanvasElement, ElementId, EditorDocument } from "@/entities/editor/document-schema";
import { createEmptyDocument } from "@/entities/editor/defaults";

import {
  cloneDocument,
  removeElementFromDocument,
  updateElementInDocument,
} from "./document-mutations";

const DEFAULT_MAX_HISTORY = 40;

export type PresentUpdateMode = "commit" | "transient";

export type EditorHistory = {
  readonly past: readonly EditorDocument[];
  readonly present: EditorDocument;
  readonly future: readonly EditorDocument[];
};

function touchMeta(doc: EditorDocument): EditorDocument {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      updatedAt: new Date().toISOString(),
    },
  };
}

function trimPast(
  past: readonly EditorDocument[],
  max: number,
): readonly EditorDocument[] {
  if (past.length <= max) return past;
  return past.slice(past.length - max);
}

function pruneSelectedIds(
  present: EditorDocument,
  selectedIds: ElementId[],
): ElementId[] {
  const allowed = new Set(present.canvas.elements.map((e) => e.id));
  return selectedIds.filter((id) => allowed.has(id));
}

type EditorState = EditorHistory & {
  maxHistory: number;
  selectedIds: ElementId[];
  isApplyingHistory: boolean;
  skipNextFabricResync: boolean;
  /** Versión lógica del timeline (UI: undo/redo habilitado). */
  historyRevision: number;

  addElement: (element: CanvasElement) => void;
  updateElement: (
    id: ElementId,
    patch: Partial<CanvasElement>,
    options?: { recordHistory?: boolean },
  ) => void;
  deleteElement: (id: ElementId) => void;
  /**
   * Reemplaza el documento presente (p. ej. sync masivo desde Fabric).
   * `commit` = nueva rama de historial; `transient` = mismo paso de undo.
   */
  replacePresent: (next: EditorDocument, mode: PresentUpdateMode) => void;

  select: (ids: ElementId[]) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markFabricMutationStart: () => void;
  consumeFabricResyncSkip: () => boolean;
  /** Captura el present en `past` sin mutarlo (sesión de edición de texto, etc.). */
  pushHistoryAnchor: () => void;
};

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    past: [],
    present: createEmptyDocument("local"),
    future: [],
    maxHistory: DEFAULT_MAX_HISTORY,
    selectedIds: [],
    isApplyingHistory: false,
    skipNextFabricResync: false,
    historyRevision: 0,

    addElement: (element) => {
      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        present: touchMeta({
          ...s.present,
          canvas: {
            ...s.present.canvas,
            elements: [...s.present.canvas.elements, element],
          },
        }),
        future: [],
        historyRevision: s.historyRevision + 1,
      }));
    },

    updateElement: (id, patch, options) => {
      const recordHistory = options?.recordHistory !== false;
      const { present } = get();
      if (!present.canvas.elements.some((e) => e.id === id)) return;

      const nextPresent = touchMeta(
        updateElementInDocument(present, id, patch),
      );

      if (!recordHistory) {
        set({ present: nextPresent });
        return;
      }

      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        present: nextPresent,
        future: [],
        historyRevision: s.historyRevision + 1,
      }));
    },

    deleteElement: (id) => {
      set((s) => {
        if (!s.present.canvas.elements.some((e) => e.id === id)) return s;
        const nextPresent = touchMeta(removeElementFromDocument(s.present, id));
        return {
          past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
          present: nextPresent,
          future: [],
          selectedIds: s.selectedIds.filter((x) => x !== id),
          historyRevision: s.historyRevision + 1,
        };
      });
    },

    replacePresent: (next, mode) => {
      const frozen = cloneDocument(next);
      if (mode === "transient") {
        set({ present: touchMeta(frozen) });
        return;
      }
      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        present: touchMeta(frozen),
        future: [],
        historyRevision: s.historyRevision + 1,
      }));
    },

    select: (ids) => set({ selectedIds: ids }),
    clearSelection: () => set({ selectedIds: [] }),

    undo: () => {
      set((s) => {
        if (s.past.length === 0) return s;
        const previous = s.past[s.past.length - 1]!;
        const newPast = s.past.slice(0, -1);
        const newFuture = [cloneDocument(s.present), ...s.future];
        const nextPresent = cloneDocument(previous);
        return {
          past: newPast,
          present: nextPresent,
          future: newFuture,
          selectedIds: pruneSelectedIds(nextPresent, s.selectedIds),
          isApplyingHistory: true,
          historyRevision: s.historyRevision + 1,
        };
      });
      queueMicrotask(() => set({ isApplyingHistory: false }));
    },

    redo: () => {
      set((s) => {
        if (s.future.length === 0) return s;
        const [next, ...restFuture] = s.future;
        const newPast = [...s.past, cloneDocument(s.present)];
        const nextPresent = cloneDocument(next);
        return {
          past: newPast,
          present: nextPresent,
          future: restFuture,
          selectedIds: pruneSelectedIds(nextPresent, s.selectedIds),
          isApplyingHistory: true,
          historyRevision: s.historyRevision + 1,
        };
      });
      queueMicrotask(() => set({ isApplyingHistory: false }));
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    markFabricMutationStart: () => set({ skipNextFabricResync: true }),

    consumeFabricResyncSkip: () => {
      if (!get().skipNextFabricResync) return false;
      set({ skipNextFabricResync: false });
      return true;
    },

    pushHistoryAnchor: () =>
      set((s) => ({
        past: trimPast([...s.past, cloneDocument(s.present)], s.maxHistory),
        future: [],
        historyRevision: s.historyRevision + 1,
      })),
  })),
);

export function resetEditorForProject(projectId: string) {
  useEditorStore.setState({
    past: [],
    present: createEmptyDocument(projectId),
    future: [],
    selectedIds: [],
    isApplyingHistory: false,
    skipNextFabricResync: false,
    historyRevision: 0,
  });
}

/** Reemplaza el documento (p. ej. carga desde Supabase) y reinicia historial. */
export function loadEditorDocument(doc: EditorDocument) {
  useEditorStore.setState((s) => ({
    past: [],
    present: cloneDocument(doc),
    future: [],
    selectedIds: [],
    isApplyingHistory: false,
    skipNextFabricResync: false,
    historyRevision: s.historyRevision + 1,
  }));
}
```

---
## FILE: src\features\editor\text\text-inspector-panel.tsx

```
"use client";

import { useEffect, useMemo, useState } from "react";

import type { TextElement } from "@/entities/editor/document-schema";
import { isTextElement } from "@/entities/editor/element-guards";
import { pickTextTypography } from "@/entities/editor/text-typography";

import { GOOGLE_FONT_OPTIONS } from "../fonts/google-fonts-catalog";
import { loadGoogleFontFamily } from "../fonts/google-font-loader";
import { useEditorStore } from "../store/editor-store";

const SYSTEM_UI_VALUE = "__SYSTEM_UI__";
const SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const FONT_WEIGHTS = [300, 400, 500, 600, 700] as const;

export function TextInspectorPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const historyRevision = useEditorStore((s) => s.historyRevision);

  const selectedText = useMemo(() => {
    void historyRevision;
    if (selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    if (!id) return null;
    const el = present.canvas.elements.find((e) => e.id === id);
    return el && isTextElement(el) ? el : null;
  }, [present.canvas.elements, selectedIds, historyRevision]);

  const [draftText, setDraftText] = useState("");
  const [draftSize, setDraftSize] = useState(String(selectedText?.fontSize ?? 48));
  useEffect(() => {
    if (selectedText) {
      setDraftText(selectedText.text);
      setDraftSize(String(selectedText.fontSize));
    }
  }, [selectedText?.id, selectedText?.text, selectedText?.fontSize]);

  if (!selectedText) {
    return (
      <section className="shrink-0 border-b border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Texto
        </h2>
        <p className="text-xs text-zinc-500">
          Seleccioná un bloque de texto (una sola capa) para editar tipografía.
        </p>
      </section>
    );
  }

  const id = selectedText.id;

  const commitTypography = (
    patch: Partial<
      Pick<
        TextElement,
        | "fontSource"
        | "fontFamily"
        | "fontSize"
        | "fontWeight"
        | "fill"
        | "textAlign"
        | "lineHeight"
        | "letterSpacing"
        | "width"
      >
    >,
  ) => {
    useEditorStore.getState().updateElement(id, patch, {
      recordHistory: true,
    });
  };

  const onFontChange = async (value: string) => {
    try {
      if (value === SYSTEM_UI_VALUE) {
        commitTypography({
          fontSource: "system",
          fontFamily: SYSTEM_FONT_STACK,
        });
        return;
      }
      await loadGoogleFontFamily(value);
      commitTypography({ fontSource: "google", fontFamily: value });
    } catch (e) {
      console.error(e);
    }
  };

  const typo = pickTextTypography(selectedText);
  const selectValue =
    typo.fontSource === "system" ? SYSTEM_UI_VALUE : typo.fontFamily;

  return (
    <section className="shrink-0 border-b border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Texto
      </h2>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Contenido
          </span>
          <textarea
            className="min-h-[4.5rem] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={() => {
              if (draftText !== selectedText.text) {
                useEditorStore.getState().updateElement(
                  id,
                  { text: draftText } as Partial<TextElement>,
                  { recordHistory: true },
                );
              }
            }}
            placeholder="Escribí aquí o editá en el canvas (doble clic)"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Fuente
          </span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={selectValue}
            onChange={(e) => void onFontChange(e.target.value)}
          >
            <option value={SYSTEM_UI_VALUE}>Sistema (UI)</option>
            {GOOGLE_FONT_OPTIONS.map((o) => (
              <option key={o.family} value={o.family}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Tamaño
            </span>
            <input
              type="number"
              min={6}
              max={400}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={draftSize}
              onChange={(e) => setDraftSize(e.target.value)}
              onBlur={() => {
                const n = Number(draftSize);
                if (!Number.isFinite(n)) {
                  setDraftSize(String(typo.fontSize));
                  return;
                }
                const clamped = Math.min(400, Math.max(6, Math.round(n)));
                setDraftSize(String(clamped));
                if (clamped !== typo.fontSize) {
                  commitTypography({ fontSize: clamped });
                }
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Peso
            </span>
            <select
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={String(typo.fontWeight)}
              onChange={(e) =>
                commitTypography({ fontWeight: Number(e.target.value) })
              }
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Color
          </span>
          <input
            type="color"
            className="h-9 w-full cursor-pointer rounded-md border border-zinc-300 bg-white p-0.5 dark:border-zinc-600"
            value={normalizeHex(typo.fill)}
            onChange={(e) => commitTypography({ fill: e.target.value })}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Alineación
          </span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { value: "left" as const, label: "Izq" },
                { value: "center" as const, label: "Centro" },
                { value: "right" as const, label: "Der" },
                { value: "justify" as const, label: "Justif." },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  typo.textAlign === opt.value
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onClick={() => commitTypography({ textAlign: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/i.test(color)) return color;
  return "#171717";
}
```

---
## FILE: src\features\editor\toolbar\add-image-control.tsx

```
"use client";

import { useRef, useState } from "react";

import { createImageElementFromFile } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT_MIME = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/i;

export function AddImageControl() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        aria-hidden
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;

          if (!ACCEPT_MIME.test(file.type)) {
            window.alert(
              "Formato no soportado. Usá PNG, JPEG, WebP, GIF o SVG.",
            );
            return;
          }
          if (file.size > MAX_BYTES) {
            window.alert("El archivo supera el límite de 20 MB.");
            return;
          }

          setBusy(true);
          try {
            const state = useEditorStore.getState();
            const element = await createImageElementFromFile(state.present, file);
            state.addElement(element);
          } catch (err) {
            console.error(err);
            window.alert("No se pudo cargar la imagen. Probá con otro archivo.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Importando…" : "+ Imagen"}
      </button>
    </>
  );
}
```

---
## FILE: src\features\editor\toolbar\editor-toolbar.tsx

```
"use client";

import Link from "next/link";
import { useState } from "react";

import { ExportModal } from "@/features/editor/export/ui";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { saveProjectDocument } from "@/services/projects/projects-service";

import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";
import { AddImageControl } from "./add-image-control";

type EditorToolbarProps = {
  fabricCanvasGetter: () => import("fabric").Canvas | null;
  projectId: string;
};

export function EditorToolbar({
  fabricCanvasGetter,
  projectId,
}: EditorToolbarProps) {
  const historyRevision = useEditorStore((s) => s.historyRevision);
  const canUndo = useEditorStore.getState().canUndo();
  const canRedo = useEditorStore.getState().canRedo();
  const [saveBusy, setSaveBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  void historyRevision;

  const isRemoteProject = projectId !== "demo";
  const canCloudSave =
    isRemoteProject && isSupabaseConfigured() && !saveBusy;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        getCanvas={fabricCanvasGetter}
      />
      <Link
        href="/"
        className="mr-1 text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Inicio
      </Link>
      <button
        type="button"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        onClick={() => {
          const s = useEditorStore.getState();
          s.addElement(createDefaultTextElement(s.present));
        }}
      >
        + Texto
      </button>
      <AddImageControl />
      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <button
        type="button"
        disabled={!canCloudSave}
        title={
          !isRemoteProject
            ? "El demo local no se guarda en la nube."
            : !isSupabaseConfigured()
              ? "Configurá Supabase en .env.local."
              : "Guardar JSON del canvas en Supabase."
        }
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-600"
        onClick={async () => {
          if (!canCloudSave) return;
          setSaveBusy(true);
          try {
            const supabase = createBrowserSupabaseClient();
            const doc = useEditorStore.getState().present;
            await saveProjectDocument(supabase, projectId, doc);
          } catch (e) {
            console.error(e);
            window.alert(
              e instanceof Error ? e.message : "No se pudo guardar el proyecto.",
            );
          } finally {
            setSaveBusy(false);
          }
        }}
      >
        {saveBusy ? "Guardando…" : "Guardar"}
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-600"
        disabled={!canUndo}
        onClick={() => useEditorStore.getState().undo()}
      >
        Deshacer
      </button>
      <button
        type="button"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-600"
        disabled={!canRedo}
        onClick={() => useEditorStore.getState().redo()}
      >
        Rehacer
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <button
        type="button"
        className="rounded-md border border-sky-600 bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60"
        onClick={() => setExportOpen(true)}
      >
        Exportar
      </button>
    </div>
  );
}
```

---
## FILE: src\lib\api\http-json.ts

```
import { NextResponse } from "next/server";

/** Respuesta JSON homogénea para Route Handlers (códigos estables, sin secretos). */
export function jsonPublicError(
  requestId: string,
  status: number,
  publicCode: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: publicCode, requestId, ...extra },
    { status },
  );
}
```

---
## FILE: src\lib\api\safe-public-message.ts

```
/**
 * Evita devolver al cliente textos de error crudos de Postgres / red interna.
 */

const SUSPICIOUS = /localhost|127\.0\.0\.1|postgres|sqlstate|internal server/i;

export function safePublicErrorMessage(
  e: unknown,
  fallback: string,
): string {
  if (!(e instanceof Error)) return fallback;
  const m = e.message.replace(/\s+/g, " ").trim();
  if (m.length === 0) return fallback;
  if (m.length > 220 || SUSPICIOUS.test(m)) return fallback;
  if (/permission denied|row-level security|rls policy/i.test(m)) {
    return "No tenés permiso para esta operación.";
  }
  return m.slice(0, 220);
}
```

---
## FILE: src\lib\auth\form-validation.ts

```
/**
 * Validación ligera en Server Actions (reduce abuso y payloads absurdos).
 * La política fuerte sigue siendo la de Supabase Auth.
 */

export const AUTH_EMAIL_MAX = 254;
export const AUTH_PASSWORD_MAX = 128;
export const AUTH_PASSWORD_MIN = 6;

export type ParsedAuthForm = {
  email: string;
  password: string;
};

export function parseAuthForm(formData: FormData): ParsedAuthForm {
  const email = String(formData.get("email") ?? "")
    .trim()
    .slice(0, AUTH_EMAIL_MAX);
  const password = String(formData.get("password") ?? "").slice(
    0,
    AUTH_PASSWORD_MAX,
  );
  return { email, password };
}

export function isPlausibleEmail(email: string): boolean {
  if (email.length < 5 || email.length > AUTH_EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPlausiblePassword(password: string): boolean {
  return (
    password.length >= AUTH_PASSWORD_MIN &&
    password.length <= AUTH_PASSWORD_MAX
  );
}

/** Mensaje seguro para query string (redirect), sin saltos de línea. */
export function safeAuthRedirectSnippet(message: string, max = 180): string {
  return message.replace(/[\r\n\u0000]/g, " ").trim().slice(0, max);
}
```

---
## FILE: src\lib\observability\structured-log.ts

```
/**
 * Logs JSON en una línea (CloudWatch / Datadog / etc.).
 * Nunca loguear tokens, cookies ni cuerpos base64 completos.
 */

export type LogLevel = "info" | "warn" | "error";

/** Superficies del servidor que emiten telemetría homogénea. */
export type StructuredLogService =
  | "api/inpaint"
  | "api/image-proxy"
  | "api/export-print"
  | "route/auth-callback"
  | "actions/projects"
  | "actions/auth";

export type StructuredLogContext = {
  readonly service: StructuredLogService;
  /** Correlación: request HTTP o invocación de Server Action. */
  readonly requestId: string;
  readonly userId?: string;
  readonly event: string;
  readonly durationMs?: number;
  readonly httpStatus?: number;
  /** Código interno estable (no mensajes de terceros ni PII). */
  readonly code?: string;
  /** Enteros métricos (p. ej. bytes devueltos por proxy). */
  readonly bytesOut?: number;
};

export function logStructuredLine(
  ctx: StructuredLogContext,
  level: LogLevel = "info",
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    ...ctx,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
```

---
## FILE: src\lib\rate-limit\inflight-user-limiter.ts

```
/**
 * Limita peticiones concurrentes por usuario (evita ráfagas contra Replicate).
 * Misma advertencia multi-instancia que memory-sliding-window.
 */

export function createInflightLimiter(maxConcurrent: number) {
  const counts = new Map<string, number>();

  return {
    tryAcquire(userId: string): boolean {
      const n = counts.get(userId) ?? 0;
      if (n >= maxConcurrent) return false;
      counts.set(userId, n + 1);
      return true;
    },
    release(userId: string): void {
      const n = counts.get(userId) ?? 0;
      if (n <= 1) counts.delete(userId);
      else counts.set(userId, n - 1);
    },
  };
}
```

---
## FILE: src\lib\rate-limit\memory-sliding-window.ts

```
/**
 * Rate limit en memoria (ventana deslizante por clave).
 *
 * LIMITACIÓN PRODUCCIÓN: en Vercel/serverless cada instancia tiene su propia memoria;
 * para límites globales usar Upstash Redis / Cloudflare / API Gateway.
 * Este módulo sigue siendo útil en Node long-lived, staging, o como capa adicional.
 */

export type SlidingWindowResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export function createSlidingWindowLimiter(args: {
  maxRequests: number;
  windowMs: number;
}): (key: string) => SlidingWindowResult {
  const hits = new Map<string, number[]>();

  return function limit(key: string): SlidingWindowResult {
    const now = Date.now();
    const windowStart = now - args.windowMs;
    const arr = hits.get(key) ?? [];
    const pruned = arr.filter((t) => t > windowStart);
    if (pruned.length >= args.maxRequests) {
      const oldest = pruned[0] ?? now;
      const retryAfterMs = Math.max(0, oldest + args.windowMs - now);
      hits.set(key, pruned);
      return { allowed: false, retryAfterMs };
    }
    pruned.push(now);
    hits.set(key, pruned);
    return { allowed: true };
  };
}
```

---
## FILE: src\lib\scheduling\yield-to-main.ts

```
/**
 * Cede el hilo principal entre pasos pesados de exportación para que el navegador
 * pueda pintar / atender input (evita “long task” monolíticos).
 */
export function yieldToMain(): Promise<void> {
  const g = globalThis as unknown as {
    scheduler?: { yield?: () => Promise<void> };
  };
  if (typeof g.scheduler?.yield === "function") {
    return g.scheduler.yield();
  }
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
```

---
## FILE: src\lib\supabase\client.ts

```
"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export function createBrowserSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (o PUBLISHABLE_KEY) en el entorno.",
    );
  }
  return createBrowserClient(url, key);
}
```

---
## FILE: src\lib\supabase\env.ts

```
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Soporta clave `anon` legacy o publishable nueva. */
export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
```

---
## FILE: src\lib\supabase\middleware.ts

```
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const url = getSupabaseUrl()!;
  const key = getSupabaseAnonKey()!;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) =>
          supabaseResponse.headers.set(k, v),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
```

---
## FILE: src\lib\supabase\require-server-user.ts

```
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RequireServerUserOk = {
  ok: true;
  userId: string;
  user: User;
  supabase: SupabaseClient;
};

export type RequireServerUserFail = {
  ok: false;
  status: 401 | 503;
  /** Código estable para respuestas JSON / mapping en acciones. */
  publicCode: "unauthorized" | "auth_backend_unavailable" | "auth_backend_error";
  /** Subcódigo solo para logs estructurados (no exponer al cliente). */
  logCode?: "no_session" | "supabase_getuser_error";
};

export type RequireServerUserResult = RequireServerUserOk | RequireServerUserFail;

/**
 * Sesión SSR + cliente Supabase listo para queries con RLS.
 * Usar en Route Handlers y Server Actions que requieren usuario autenticado.
 */
export async function requireServerUser(): Promise<RequireServerUserResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, publicCode: "auth_backend_unavailable" };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return {
        ok: false,
        status: 401,
        publicCode: "unauthorized",
        logCode: error ? "supabase_getuser_error" : "no_session",
      };
    }
    return { ok: true, userId: user.id, user, supabase };
  } catch {
    return { ok: false, status: 503, publicCode: "auth_backend_error" };
  }
}
```

---
## FILE: src\lib\supabase\server.ts

```
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function createServerSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (o PUBLISHABLE_KEY) en el entorno.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* En RSC el refresh de tokens lo resuelve `middleware`. */
        }
      },
    },
  });
}
```

---
## FILE: src\middleware.ts

```
import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---
## FILE: src\services\auth\auth-service.ts

```
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSiteOrigin } from "@/lib/supabase/env";

export async function signInWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const emailRedirectTo = `${getSiteOrigin()}/auth/callback`;
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
```

---
## FILE: src\services\inpaint\env.ts

```
export function getReplicateApiToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

/** ID de versión del modelo (no el slug `owner/name`). */
export function getReplicateInpaintVersion(): string | undefined {
  return process.env.REPLICATE_INPAINT_VERSION;
}

export function isReplicateInpaintConfigured(): boolean {
  return Boolean(getReplicateApiToken() && getReplicateInpaintVersion());
}
```

---
## FILE: src\services\inpaint\index.ts

```
export type {
  InpaintImagePixelROI,
  InpaintProvider,
  InpaintRasterPayload,
  InpaintRemoteResult,
  InpaintSceneRect,
} from "./inpaint-types";
export { createReplicateSdInpaintProvider } from "./replicate-sd-inpaint-provider";
export {
  getReplicateApiToken,
  getReplicateInpaintVersion,
  isReplicateInpaintConfigured,
} from "./env";
```

---
## FILE: src\services\inpaint\inpaint-types.ts

```
/**
 * Contrato del pipeline de inpainting / “borrador mágico”.
 * El proveedor concreto (p. ej. Replicate) implementa la llamada remota.
 */

export type InpaintSceneRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** ROI en píxeles del bitmap de la imagen (origen arriba-izquierda). */
export type InpaintImagePixelROI = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type InpaintRasterPayload = {
  /** PNG (p. ej. `data:image/png;base64,...`) del frame completo a procesar. */
  imageDataUrl: string;
  /** PNG en las mismas dimensiones lógicas que `imageDataUrl`; blanco = zona a inpaint. */
  maskDataUrl: string;
  /** Prompt opcional para modelos generativos. */
  prompt?: string;
};

export type InpaintRemoteResult = {
  /** URL HTTPS devuelta por el proveedor (p. ej. Replicate `output`). */
  outputUrl: string;
};

export type InpaintProviderRunInput = InpaintRasterPayload & {
  prompt?: string;
};

export type InpaintProvider = {
  readonly id: "replicate-sd-inpaint";
  run(input: InpaintProviderRunInput): Promise<InpaintRemoteResult>;
};
```

---
## FILE: src\services\inpaint\replicate-http.ts

```
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
```

---
## FILE: src\services\inpaint\replicate-sd-inpaint-provider.ts

```
import type {
  InpaintProvider,
  InpaintProviderRunInput,
  InpaintRemoteResult,
} from "./inpaint-types";
import {
  replicateCreatePrediction,
  replicateWaitForOutput,
} from "./replicate-http";

function firstOutputUrl(output: unknown): string {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output) && typeof output[0] === "string") {
    return output[0];
  }
  throw new Error("Salida de Replicate inesperada: se esperaba URL o [url].");
}

/**
 * Proveedor concreto: Stable Diffusion Inpainting en Replicate.
 * Los nombres de `input` siguen el esquema público del modelo (image, mask, prompt, …).
 * Si una versión del modelo dejara de aceptar `data:` URLs, subí los PNG a Storage
 * y pasá aquí URLs `https://` (el contrato `InpaintProvider` no cambia).
 *
 * @see https://replicate.com/stability-ai/stable-diffusion-inpainting
 */
export function createReplicateSdInpaintProvider(args: {
  token: string;
  /** Hash de versión del modelo en Replicate (Settings → API / version id). */
  version: string;
}): InpaintProvider {
  const run = async (
    input: InpaintProviderRunInput,
  ): Promise<InpaintRemoteResult> => {
    const prediction = await replicateCreatePrediction({
      token: args.token,
      version: args.version,
      input: {
        image: input.imageDataUrl,
        mask: input.maskDataUrl,
        prompt:
          input.prompt?.trim() ||
          "seamlessly remove the masked region, natural continuation of the scene",
        num_inference_steps: 25,
      },
      preferWaitSeconds: 60,
    });

    let output: unknown = prediction.output;
    if (prediction.status !== "succeeded" || output == null) {
      output = await replicateWaitForOutput({
        token: args.token,
        predictionId: prediction.id,
        pollIntervalMs: 1500,
        maxAttempts: 120,
      });
    }

    return { outputUrl: firstOutputUrl(output) };
  };

  return { id: "replicate-sd-inpaint", run };
}
```

---
## FILE: src\services\print\cmyk-pdf-from-raster.ts

```
/**
 * Construcción de PDF de prensa con raster en CMYK (Node / sharp + pdfkit).
 * Flujo: RGB raster → sharp (`flatten` + `toColorspace('cmyk')`) → JPEG CMYK → `pdfkit` en página con sangrado.
 * Verificar colorimetría con Adobe Acrobat / Preflight u otro RIP; algunos visores prevén en RGB.
 *
 * Perfiles ICC (próximo paso en host): montar `SHARP_PRINT_INPUT_ICC` / salida ICC y encadenar
 * en esta tubería según política de color (no hardcodear rutas en el repo).
 */

import PDFDocument from "pdfkit";
import sharp from "sharp";

export type BuildCmykPrintPdfArgs = {
  /** PNG o JPEG RGB (buffer). */
  rgbRaster: Buffer;
  /** Ancho del cajón de contenido en puntos PDF (sin sangrado). */
  contentWidthPt: number;
  contentHeightPt: number;
  bleedPt: number;
  drawCropMarks: boolean;
};

function strokeCropMarks(
  doc: InstanceType<typeof PDFDocument>,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  bleed: number,
): void {
  const markLen = Math.min(12, Math.max(4, bleed * 0.45));
  doc.save().lineWidth(0.2).strokeColor("black").opacity(1);
  const segments: [number, number, number, number][] = [
    [bx, by, bx - markLen, by],
    [bx, by, bx, by - markLen],
    [bx + bw, by, bx + bw + markLen, by],
    [bx + bw, by, bx + bw, by - markLen],
    [bx, by + bh, bx - markLen, by + bh],
    [bx, by + bh, bx, by + bh + markLen],
    [bx + bw, by + bh, bx + bw + markLen, by + bh],
    [bx + bw, by + bh, bx + bw, by + bh + markLen],
  ];
  for (const [x1, y1, x2, y2] of segments) {
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  }
  doc.restore();
}

/**
 * Convierte RGB → CMYK vía sharp y compone un PDF con pdfkit.
 */
export async function buildCmykPrintPdfBuffer(
  args: BuildCmykPrintPdfArgs,
): Promise<Buffer> {
  const cmykJpeg = await sharp(args.rgbRaster)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace("cmyk")
    .jpeg({
      quality: 92,
      chromaSubsampling: "4:4:4",
      mozjpeg: true,
    })
    .toBuffer();

  const pageW = args.contentWidthPt + 2 * args.bleedPt;
  const pageH = args.contentHeightPt + 2 * args.bleedPt;

  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: 0,
    autoFirstPage: true,
    pdfVersion: "1.6",
  });

  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.image(cmykJpeg, args.bleedPt, args.bleedPt, {
    width: args.contentWidthPt,
    height: args.contentHeightPt,
  });

  if (args.drawCropMarks) {
    strokeCropMarks(
      doc,
      args.bleedPt,
      args.bleedPt,
      args.contentWidthPt,
      args.contentHeightPt,
      args.bleedPt,
    );
  }

  doc.end();
  return finished;
}
```

---
## FILE: src\services\print\print-service.ts

```
/**
 * Capa de servicio de impresión (CMYK, PDF prensa).
 * Mantener imports de Node (sharp, pdfkit) solo desde API routes o este módulo,
 * nunca desde componentes cliente.
 */

export { buildCmykPrintPdfBuffer } from "./cmyk-pdf-from-raster";
export type { BuildCmykPrintPdfArgs } from "./cmyk-pdf-from-raster";
```

---
## FILE: src\services\projects\project.types.ts

```
import type { EditorDocument } from "@/entities/editor/document-schema";

/** Fila `public.projects` (JSON canónico del editor). */
export type ProjectRow = {
  id: string;
  user_id: string;
  data: EditorDocument;
  created_at: string;
};

export type ProjectSummary = Pick<ProjectRow, "id" | "created_at">;
```

---
## FILE: src\services\projects\projects-service.ts

```
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EditorDocument } from "@/entities/editor/document-schema";
import { createEmptyDocument } from "@/entities/editor/defaults";
import {
  cloneDocument,
  hydrateEditorDocument,
} from "@/features/editor/store/document-mutations";

import type { ProjectRow, ProjectSummary } from "./project.types";

export async function listProjectsForUser(
  supabase: SupabaseClient,
): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectSummary[];
}

export async function getProjectById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, data, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Omit<ProjectRow, "data"> & { data: unknown };
  const doc = hydrateEditorDocument(row.data, row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    data: doc,
    created_at: row.created_at,
  };
}

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const doc = createEmptyDocument(id);

  const { error } = await supabase.from("projects").insert({
    id,
    user_id: userId,
    data: doc,
  });

  if (error) throw error;
  return id;
}

export async function saveProjectDocument(
  supabase: SupabaseClient,
  projectId: string,
  document: EditorDocument,
): Promise<void> {
  const payload = cloneDocument({
    ...document,
    projectId,
    meta: {
      ...document.meta,
      updatedAt: new Date().toISOString(),
    },
  });

  const { error } = await supabase
    .from("projects")
    .update({ data: payload })
    .eq("id", projectId);

  if (error) throw error;
}
```

---
## FILE: supabase\migrations\20260504120000_create_projects.sql

```
-- Tabla de proyectos del editor (JSON canónico).
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_delete_own"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = user_id);
```
