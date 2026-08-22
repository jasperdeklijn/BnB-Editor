import { NextResponse } from "next/server"

import { logAuditEvent, type AuditAction } from "@/lib/audit-log"
import { isOnboardingEnabled } from "@/lib/onboarding/config"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

const ACTIONS: Record<string, AuditAction> = {
  started: "onboarding.started",
  step_viewed: "onboarding.step_viewed",
  validation_failed: "onboarding.validation_failed",
}
const FIELDS = new Set([
  "firstName", "lastName", "phone", "jobTitle", "locale", "name", "category", "country", "city",
  "publicEmail", "publicPhone", "chamberOfCommerceNumber", "vatNumber", "title", "slug", "primaryGoal",
  "defaultLocale", "description", "existingWebsiteUrl",
])

export async function POST(request: Request) {
  if (!isOnboardingEnabled()) return new NextResponse(null, { status: 204 })
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = checkRateLimit(getRateLimitKey(request, `onboarding_event:${data.user.id}`), 60, 60_000)
  if (!limit.allowed) return new NextResponse(null, { status: 204 })

  const body = await request.json().catch(() => null)
  const action = typeof body?.event === "string" ? ACTIONS[body.event] : null
  const step = Number.isInteger(body?.step) && body.step >= 1 && body.step <= 3 ? body.step : null
  const field = typeof body?.field === "string" && FIELDS.has(body.field) ? body.field : null
  if (!action) return NextResponse.json({ error: "Invalid event" }, { status: 400 })

  await logAuditEvent({
    userId: data.user.id,
    action,
    metadata: { ...(step ? { step } : {}), ...(field ? { field } : {}) },
    request,
  })
  return new NextResponse(null, { status: 204 })
}

