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
