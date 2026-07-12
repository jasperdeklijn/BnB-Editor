import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import type { PlanId } from "@/lib/types/pricing"

export const TIER_TEST_COOKIE = "flexpagina-tier-test"
export const TIER_TEST_MAX_AGE_SECONDS = 8 * 60 * 60

type CookieReader = {
  get(name: string): { value: string } | undefined
}

export function isTierTestSwitchEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false
  return process.env.NODE_ENV === "development" || process.env.ENABLE_TIER_TEST_SWITCH === "true"
}

function isPlanId(value: unknown): value is PlanId {
  return value === "bronze" || value === "silver" || value === "gold"
}

function sign(value: string): string {
  // The fixed fallback is safe only because overrides are hard-disabled in production.
  // A configured secret is recommended for shared non-production environments.
  const secret =
    process.env.TIER_TEST_SWITCH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "flexpagina-local-tier-test-v1"
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function createTierTestCookieValue(plan: PlanId): string {
  const issuedAt = Date.now().toString(36)
  const payload = `${plan}.${issuedAt}`
  return `${payload}.${sign(payload)}`
}

export function readTierTestPlan(cookies: CookieReader): PlanId | null {
  if (!isTierTestSwitchEnabled()) return null
  const value = cookies.get(TIER_TEST_COOKIE)?.value
  if (!value) return null

  const [plan, issuedAt, signature] = value.split(".")
  if (!isPlanId(plan) || !issuedAt || !signature) return null

  const timestamp = Number.parseInt(issuedAt, 36)
  if (!Number.isFinite(timestamp)) return null
  if (Date.now() - timestamp > TIER_TEST_MAX_AGE_SECONDS * 1000) return null

  const expected = Buffer.from(sign(`${plan}.${issuedAt}`))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  return plan
}
