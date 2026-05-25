/**
 * KRL.KR — Redis Client
 * Used for: URL caching, rate limiting, session management
 */
import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    _redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    _redis.on("error", (err) => {
      console.error("Redis error:", err.message);
    });
  }
  return _redis;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const val = await redis.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 60
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch {}
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const redis = getRedis();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const redisKey = `rl:${key}`;

    // Use a sorted set with timestamps as scores
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, "-inf", windowStart);
    pipeline.zcard(redisKey);
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipeline.expire(redisKey, windowSeconds + 1);
    const results = await pipeline.exec();

    const count = (results?.[1]?.[1] as number) ?? 0;
    const resetAt = now + windowSeconds * 1000;

    if (count >= limit) {
      return { allowed: false, remaining: 0, resetAt };
    }
    return { allowed: true, remaining: limit - count - 1, resetAt };
  } catch {
    // If Redis is down, allow the request (fail open)
    return { allowed: true, remaining: limit, resetAt: Date.now() + 60000 };
  }
}
