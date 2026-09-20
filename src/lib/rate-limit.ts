import { Redis } from "ioredis";
import { env } from "./env";
import { HttpError } from "./http";

let redis: Redis | undefined;
function client() { return redis ??= new Redis(env().REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false }); }

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const bucket = `rate:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const count = await client().incr(bucket);
  if (count === 1) await client().expire(bucket, windowSeconds + 1);
  if (count > limit) throw new HttpError(429, "Too many requests. Please wait briefly and try again.", "RATE_LIMITED");
}
