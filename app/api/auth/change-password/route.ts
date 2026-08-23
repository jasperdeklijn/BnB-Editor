import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

const CHANGE_ERROR = "Het wachtwoord kon niet worden gewijzigd. Probeer het opnieuw."

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getRateLimitKey(request, "change_password"), 6, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer het later opnieuw." },
      { status: 429 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "U moet opnieuw inloggen." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""

  if (!currentPassword || currentPassword.length > 1024 || newPassword.length < 8 || newPassword.length > 1024) {
    return NextResponse.json({ error: CHANGE_ERROR }, { status: 400 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Kies een ander wachtwoord dan uw huidige wachtwoord." },
      { status: 400 },
    )
  }

  const { error: updateError } = await supabase.auth.updateUser({
    current_password: currentPassword,
    password: newPassword,
  })

  if (updateError) {
    console.warn("[change-password] Supabase password update failed", { message: updateError.message })
    if (updateError.code === "reauthentication_not_valid" || updateError.code === "invalid_credentials") {
      return NextResponse.json({ error: "Het huidige wachtwoord is niet juist." }, { status: 400 })
    }
    if (updateError.code === "same_password") {
      return NextResponse.json(
        { error: "Kies een ander wachtwoord dan uw huidige wachtwoord." },
        { status: 400 },
      )
    }
    if (updateError.code === "weak_password") {
      return NextResponse.json({ error: "Kies een sterker wachtwoord." }, { status: 400 })
    }
    return NextResponse.json({ error: CHANGE_ERROR }, { status: 400 })
  }

  await logAuditEvent({ userId: user.id, action: "password.changed", request })
  return NextResponse.json({ success: true })
}
