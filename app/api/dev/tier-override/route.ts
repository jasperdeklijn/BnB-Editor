import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  createTierTestCookieValue,
  isTierTestSwitchEnabled,
  TIER_TEST_COOKIE,
  TIER_TEST_MAX_AGE_SECONDS,
} from "@/lib/tier-test-override"
import type { PlanId } from "@/lib/types/pricing"

function isPlanId(value: unknown): value is PlanId {
  return value === "bronze" || value === "silver" || value === "gold"
}

export async function POST(request: Request) {
  if (!isTierTestSwitchEnabled()) {
    return NextResponse.json({ error: "Tier test mode is disabled" }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const plan = body?.plan
  if (plan !== null && !isPlanId(plan)) {
    return NextResponse.json({ error: "Invalid test plan" }, { status: 400 })
  }

  const response = NextResponse.json({ success: true, plan })
  if (plan === null) {
    response.cookies.delete(TIER_TEST_COOKIE)
  } else {
    response.cookies.set(TIER_TEST_COOKIE, createTierTestCookieValue(plan), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TIER_TEST_MAX_AGE_SECONDS,
    })
  }
  return response
}
