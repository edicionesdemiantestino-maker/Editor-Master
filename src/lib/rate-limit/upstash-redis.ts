import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

/**
 * Cliente Upstash REST singleton. `undefined` = aún no evaluado; `null` = sin credenciales.
 */
export function getUpstashRedis(): Redis | null {
  if (cached !== undefined) return cached === null ? null : cached;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

export function isUpstashRedisConfigured(): boolean {
  return getUpstashRedis() !== null;
}
