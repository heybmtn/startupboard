import type { Env } from "../types";

/**
 * Fixed-window rate limit backed by D1. Coarse but good enough for an MVP —
 * blocks obvious abuse of checkout/upload endpoints without needing a
 * separate KV/Durable Object.
 */
export async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const bucketKey = key;

  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket_key, window_start, count)
     VALUES (?1, ?2, 1)
     ON CONFLICT(bucket_key, window_start) DO UPDATE SET count = count + 1`
  )
    .bind(bucketKey, windowStart)
    .run();

  const row = await env.DB.prepare(
    `SELECT count FROM rate_limits WHERE bucket_key = ?1 AND window_start = ?2`
  )
    .bind(bucketKey, windowStart)
    .first<{ count: number }>();

  return (row?.count ?? 0) <= limit;
}

export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
