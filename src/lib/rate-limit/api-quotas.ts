/**
 * Cuotas compartidas para APIs públicas (una sola fuente de verdad).
 * Cada ruta app/api reexporta desde su constants.ts para no romper imports existentes.
 */

export const INPAINT_MAX_BODY_BYTES = 5 * 1024 * 1024;
export const INPAINT_MAX_EDGE_PX = 2048;
export const INPAINT_MAX_PROMPT_LENGTH = 2000;
export const INPAINT_QUOTA_PER_DAY = 20;
export const INPAINT_RATE_LIMIT_MAX = 8;
export const INPAINT_RATE_LIMIT_WINDOW_MS = 60_000;
export const INPAINT_MAX_CONCURRENT_PER_USER = 1;
export const INPAINT_REDIS_SLOT_TTL_SEC = 900;

export const IMAGE_PROXY_MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
export const IMAGE_PROXY_UPSTREAM_TIMEOUT_MS = 45_000;
export const IMAGE_PROXY_RATE_LIMIT_MAX = 40;
export const IMAGE_PROXY_RATE_LIMIT_WINDOW_MS = 60_000;
export const IMAGE_PROXY_MAX_CONCURRENT_PER_USER = 4;
export const IMAGE_PROXY_REDIS_SLOT_TTL_SEC = 600;

export const EXPORT_PRINT_MAX_BODY_BYTES = 28 * 1024 * 1024;
export const EXPORT_PRINT_MAX_EDGE_PX = 8192;
export const EXPORT_PRINT_QUOTA_PER_DAY = 10;
export const EXPORT_PRINT_RATE_LIMIT_MAX = 6;
export const EXPORT_PRINT_RATE_LIMIT_WINDOW_MS = 60_000;
export const EXPORT_PRINT_MAX_CONCURRENT_PER_USER = 1;
export const EXPORT_PRINT_REDIS_SLOT_TTL_SEC = 900;
export const EXPORT_PRINT_TARGET_DPI_MIN = 72;
export const EXPORT_PRINT_TARGET_DPI_MAX = 600;

/** Server Action createProjectAction: no es HTTP route; comparte Upstash con prefijo create-project. */
export const CREATE_PROJECT_RATE_LIMIT_MAX = 15;
export const CREATE_PROJECT_RATE_LIMIT_WINDOW_MS = 60_000;
