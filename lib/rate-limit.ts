import { createHash } from "node:crypto"

type RateLimitEntry = { count: number; resetAt: number }

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  reason?: "unavailable"
}

const developmentBuckets = new Map<string, RateLimitEntry>()

function checkDevelopmentFallback(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const current = developmentBuckets.get(key)
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs
    developmentBuckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt }
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, resetAt: current.resetAt }
  current.count += 1
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const normalizedLimit = Math.max(1, Math.min(1_000, Math.floor(limit)))
  const windowSeconds = Math.max(1, Math.min(86_400, Math.ceil(windowMs / 1_000)))
  const keyHash = createHash("sha256").update(key).digest("hex")

  if (!supabaseUrl || !serviceRoleKey) {
    if (process.env.NODE_ENV !== "production") return checkDevelopmentFallback(keyHash, normalizedLimit, windowMs)
    console.error("[rate-limit] Supabase configuration is missing; request denied.")
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs, reason: "unavailable" }
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
      body: JSON.stringify({ p_key_hash: keyHash, p_limit: normalizedLimit, p_window_seconds: windowSeconds }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(`rate-limit RPC returned ${response.status}`)
    const rows = await response.json() as Array<{ allowed: boolean; remaining: number; reset_at: string }>
    const result = rows[0]
    if (!result || typeof result.allowed !== "boolean" || !Number.isFinite(result.remaining)
      || !Number.isFinite(new Date(result.reset_at).getTime())) {
      throw new Error("rate-limit RPC returned an invalid result")
    }
    return {
      allowed: result.allowed,
      remaining: Math.max(0, Number(result.remaining) || 0),
      resetAt: new Date(result.reset_at).getTime(),
    }
  } catch (error) {
    console.error("[rate-limit] Shared limiter unavailable", error)
    if (process.env.NODE_ENV !== "production") return checkDevelopmentFallback(keyHash, normalizedLimit, windowMs)
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs, reason: "unavailable" }
  }
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
