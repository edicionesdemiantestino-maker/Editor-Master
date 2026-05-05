import { fnv1a32 } from "@/lib/hash/fnv1a";
import { getUpstashRedis } from "@/lib/rate-limit/upstash-redis";

type CacheHit = { hit: true; outputUrl: string };
type CacheMiss = { hit: false };

const mem = new Map<string, { outputUrl: string; expiresAt: number }>();

function now() {
  return Date.now();
}

function cacheKey(args: {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
}): string {
  // No guardamos el payload completo como clave; solo un hash estable.
  const s = `${args.prompt ?? ""}::${args.imageDataUrl.length}:${args.maskDataUrl.length}:${args.imageDataUrl.slice(0, 64)}:${args.maskDataUrl.slice(0, 64)}`;
  return `em:inpaint:cache:${fnv1a32(s)}`;
}

export async function getInpaintCachedResult(args: {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
}): Promise<CacheHit | CacheMiss> {
  const key = cacheKey(args);
  const redis = getUpstashRedis();
  if (redis) {
    const v = await redis.get<string>(key);
    if (typeof v === "string" && v.startsWith("http")) {
      return { hit: true, outputUrl: v };
    }
    return { hit: false };
  }
  const e = mem.get(key);
  if (!e) return { hit: false };
  if (e.expiresAt <= now()) {
    mem.delete(key);
    return { hit: false };
  }
  return { hit: true, outputUrl: e.outputUrl };
}

export async function setInpaintCachedResult(args: {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
  outputUrl: string;
}): Promise<void> {
  const key = cacheKey(args);
  const redis = getUpstashRedis();
  if (redis) {
    await redis.set(key, args.outputUrl, { ex: 24 * 60 * 60 });
    return;
  }
  mem.set(key, { outputUrl: args.outputUrl, expiresAt: now() + 24 * 60 * 60 * 1000 });
}

