import type { HybridConcurrentSlots } from "./hybrid-concurrent-slots";
import { createHybridConcurrentSlotLimiter } from "./hybrid-concurrent-slots";
import type { HybridRateDecision } from "./hybrid-sliding-window";
import { createHybridSlidingWindowRateLimiter } from "./hybrid-sliding-window";
import {
  AI_TEXT_RATE_LIMIT_MAX,
  AI_TEXT_RATE_LIMIT_WINDOW_MS,
  CREATE_PROJECT_RATE_LIMIT_MAX,
  CREATE_PROJECT_RATE_LIMIT_WINDOW_MS,
  EXPORT_PRINT_MAX_CONCURRENT_PER_USER,
  EXPORT_PRINT_RATE_LIMIT_MAX,
  EXPORT_PRINT_RATE_LIMIT_WINDOW_MS,
  EXPORT_PRINT_REDIS_SLOT_TTL_SEC,
  IMAGE_PROXY_MAX_CONCURRENT_PER_USER,
  IMAGE_PROXY_RATE_LIMIT_MAX,
  IMAGE_PROXY_RATE_LIMIT_WINDOW_MS,
  IMAGE_PROXY_REDIS_SLOT_TTL_SEC,
  INPAINT_MAX_CONCURRENT_PER_USER,
  INPAINT_RATE_LIMIT_MAX,
  INPAINT_RATE_LIMIT_WINDOW_MS,
  INPAINT_REDIS_SLOT_TTL_SEC,
} from "./api-quotas";

/**
 * Servicio central de rate limiting distribuido (Upstash) + fallback en memoria,
 * y slots de concurrencia por usuario (Redis Lua o memoria).
 *
 * Claves de rate limit: `u:<userId>` por servicio (prefijo Redis `em:rl:<namespace>`).
 */

const sliding = new Map<string, (id: string) => Promise<HybridRateDecision>>();
const slots = new Map<string, HybridConcurrentSlots>();

function getSliding(
  namespace: string,
  maxRequests: number,
  windowMs: number,
): (id: string) => Promise<HybridRateDecision> {
  const k = `${namespace}:${maxRequests}:${windowMs}`;
  let fn = sliding.get(k);
  if (!fn) {
    fn = createHybridSlidingWindowRateLimiter({
      name: namespace,
      maxRequests,
      windowMs,
    });
    sliding.set(k, fn);
  }
  return fn;
}

function getSlots(
  prefix: string,
  maxConcurrent: number,
  ttlSeconds: number,
): HybridConcurrentSlots {
  const k = `${prefix}:${maxConcurrent}:${ttlSeconds}`;
  let s = slots.get(k);
  if (!s) {
    s = createHybridConcurrentSlotLimiter({
      prefix,
      maxConcurrent,
      ttlSeconds,
    });
    slots.set(k, s);
  }
  return s;
}

function userKey(userId: string): string {
  return `u:${userId}`;
}

export const rateLimitService = {
  /** POST /api/inpaint */
  async consumeInpaint(userId: string): Promise<HybridRateDecision> {
    return getSliding(
      "inpaint",
      INPAINT_RATE_LIMIT_MAX,
      INPAINT_RATE_LIMIT_WINDOW_MS,
    )(userKey(userId));
  },
  inpaintSlots(): HybridConcurrentSlots {
    return getSlots("inpaint", INPAINT_MAX_CONCURRENT_PER_USER, INPAINT_REDIS_SLOT_TTL_SEC);
  },

  /** GET /api/image-proxy */
  async consumeImageProxy(userId: string): Promise<HybridRateDecision> {
    return getSliding(
      "image-proxy",
      IMAGE_PROXY_RATE_LIMIT_MAX,
      IMAGE_PROXY_RATE_LIMIT_WINDOW_MS,
    )(userKey(userId));
  },
  imageProxySlots(): HybridConcurrentSlots {
    return getSlots(
      "image-proxy",
      IMAGE_PROXY_MAX_CONCURRENT_PER_USER,
      IMAGE_PROXY_REDIS_SLOT_TTL_SEC,
    );
  },

  /** POST /api/export-print */
  async consumeExportPrint(userId: string): Promise<HybridRateDecision> {
    return getSliding(
      "export-print",
      EXPORT_PRINT_RATE_LIMIT_MAX,
      EXPORT_PRINT_RATE_LIMIT_WINDOW_MS,
    )(userKey(userId));
  },
  exportPrintSlots(): HybridConcurrentSlots {
    return getSlots(
      "export-print",
      EXPORT_PRINT_MAX_CONCURRENT_PER_USER,
      EXPORT_PRINT_REDIS_SLOT_TTL_SEC,
    );
  },

  /** Server Action crear proyecto (comparte Upstash con prefijo `create-project`). */
  async consumeCreateProject(userId: string): Promise<HybridRateDecision> {
    return getSliding(
      "create-project",
      CREATE_PROJECT_RATE_LIMIT_MAX,
      CREATE_PROJECT_RATE_LIMIT_WINDOW_MS,
    )(userKey(userId));
  },

  async consumeAiText(userId: string): Promise<HybridRateDecision> {
    return getSliding(
      "ai-text",
      AI_TEXT_RATE_LIMIT_MAX,
      AI_TEXT_RATE_LIMIT_WINDOW_MS,
    )(userKey(userId));
  },
} as const;
