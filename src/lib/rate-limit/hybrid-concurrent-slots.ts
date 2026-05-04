import { createInflightLimiter } from "./inflight-user-limiter";
import { getUpstashRedis } from "./upstash-redis";

/**
 * Slots concurrentes atómicos en Redis (Lua INCR + tope).
 * Sin Redis: mismo límite en memoria (solo instancia local).
 */
const ACQUIRE_LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
if tonumber(c) > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

const RELEASE_LUA = `
local v = redis.call('GET', KEYS[1])
if v and tonumber(v) > 0 then
  return redis.call('DECR', KEYS[1])
end
return 0
`;

export type HybridConcurrentSlots = {
  tryAcquire: (userId: string) => Promise<boolean>;
  release: (userId: string) => Promise<void>;
};

export function createHybridConcurrentSlotLimiter(args: {
  prefix: string;
  maxConcurrent: number;
  /** TTL del contador si el proceso muere sin `release` (segundos). */
  ttlSeconds: number;
}): HybridConcurrentSlots {
  const mem = createInflightLimiter(args.maxConcurrent);
  const redis = getUpstashRedis();

  return {
    async tryAcquire(userId: string): Promise<boolean> {
      if (!redis) {
        return mem.tryAcquire(userId);
      }
      const key = `em:slot:${args.prefix}:${userId}`;
      const res = await redis.eval(
        ACQUIRE_LUA,
        [key],
        [String(args.maxConcurrent), String(args.ttlSeconds)],
      );
      return Number(res) === 1;
    },
    async release(userId: string): Promise<void> {
      if (!redis) {
        mem.release(userId);
        return;
      }
      const key = `em:slot:${args.prefix}:${userId}`;
      await redis.eval(RELEASE_LUA, [key], []);
    },
  };
}
