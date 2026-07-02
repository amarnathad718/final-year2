import { NextRequest } from "next/server";

type Entry = {
  count: number;
  resetAt: number;
};

const bucket = new Map<string, Entry>();

export function rateLimit(request: NextRequest, limit = 80, windowMs = 60_000) {
  const key = request.headers.get("x-forwarded-for") ?? request.headers.get("host") ?? "local";
  const now = Date.now();

  const existing = bucket.get(key);
  if (!existing || existing.resetAt < now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  bucket.set(key, existing);
  return { ok: true };
}
