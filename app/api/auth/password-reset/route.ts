import { NextResponse } from "next/server"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

const GENERIC_MESSAGE = "Als dit e-mailadres bij ons bekend is, ontvangt u een link om uw wachtwoord opnieuw in te stellen."

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getRateLimitKey(request, "password_reset"), 4, 30 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Te veel aanvragen. Probeer het later opnieuw." },
      { status: 429 },
    )
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!email || email.length > 254) {
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }

  const supabase = await createClient()
  const origin = new URL(request.url).origin
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  })

  if (error) {
    console.warn("[password-reset] Supabase reset request failed", { message: error.message })
  }

  return NextResponse.json({ message: GENERIC_MESSAGE })
}

