import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { isOnboardingEnabled } from "@/lib/onboarding/config"

const LOGIN_ERROR = "Inloggen is niet gelukt. Controleer uw gegevens en probeer het opnieuw."

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getRateLimitKey(request, "login"), 8, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Te veel inlogpogingen. Probeer het later opnieuw." },
      { status: 429 },
    )
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!email || !password || email.length > 254 || password.length > 1024) {
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 400 })
  }

  await logAuditEvent({
    userId: data.user.id,
    action: "login",
    request,
  })

  let requiresOnboarding = false
  if (isOnboardingEnabled()) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", data.user.id)
      .maybeSingle()
    requiresOnboarding = !profileError && !profile?.onboarding_completed_at
  }

  return NextResponse.json({ success: true, requiresOnboarding })
}
