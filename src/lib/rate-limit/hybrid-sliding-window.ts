import type { Duration } from "@upstash/ratelimit";
import { Ratelimit } from "@upstash/ratelimit";

import { createSlidingWindowLimiter } from "./memory-sliding-window";
import { getUpstashRedis } from "./upstash-redis";

export type HybridRateDecision =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * Rate limit distribuido (Upstash sliding window) si hay `UPSTASH_REDIS_*`;
 * si no, ventana en memoria (una instancia).
 */
export function createHybridSlidingWindowRateLimiter(args: {
  /** Prefijo estable en Redis (p. ej. `inpaint`, `image-proxy`). */
  name: string;
  maxRequests: number;
  windowMs: number;
}): (key: string) => Promise<HybridRateDecision> {
  const memory = createSlidingWindowLimiter({
    maxRequests: args.maxRequests,
    windowMs: args.windowMs,
  });

  const redis = getUpstashRedis();
  let ratelimit: Ratelimit | null = null;
  if (redis) {
    // `@upstash/ratelimit` acepta ventana exacta en ms (p. ej. `60000 ms`).
    const windowStr = `${Math.max(1, Math.floor(args.windowMs))} ms` as Duration;
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(args.maxRequests, windowStr),
      prefix: `em:rl:${args.name}`,
      analytics: false,
    });
  }

  return async (key: string): Promise<HybridRateDecision> => {
    if (ratelimit) {
      const { success, reset } = await ratelimit.limit(key);
      if (!success) {
        const retryAfterMs = Math.max(0, reset - Date.now());
        return { allowed: false, retryAfterMs };
      }
      return { allowed: true };
    }
    const r = memory(key);
    if (!r.allowed) {
      return { allowed: false, retryAfterMs: r.retryAfterMs };
    }
    return { allowed: true };
  };
}
