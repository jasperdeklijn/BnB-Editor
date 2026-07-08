import { NextResponse } from "next/server"
import { logAuditEvent, type AuditAction } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

const allowedActions = new Set<AuditAction>(["subscription.changed", "payment.failed"])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action as AuditAction : null

  if (!action || !allowedActions.has(action)) {
    return NextResponse.json({ error: "Invalid audit event" }, { status: 400 })
  }

  await logAuditEvent({
    userId: user.id,
    action,
    metadata: typeof body?.metadata === "object" && body.metadata !== null ? body.metadata : null,
    request,
  })

  return NextResponse.json({ success: true })
}
