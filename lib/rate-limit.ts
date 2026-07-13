type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()
let lastCleanupAt = 0

// TODO: Replace this per-process MVP limiter with a shared store such as
// Upstash/Redis before horizontally scaling. Serverless instances do not share
// this Map, so it reduces abuse but is not a global enforcement boundary.
function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return

  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
  lastCleanupAt = now
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  cleanupExpiredBuckets(now)
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}

export function getRateLimitKey(request: Request, action: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"

  return `${action}:${ip}`
}
