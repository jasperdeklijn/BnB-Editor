import { NextResponse } from "next/server"

import { logAuditEvent, type AuditAction } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

const allowedActions = new Set<AuditAction>([
  "entitlement.warning_shown",
  "entitlement.upgrade_clicked",
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action as AuditAction : null
  if (!action || !allowedActions.has(action)) {
    return NextResponse.json({ error: "Invalid audit event" }, { status: 400 })
  }

  const violationCodes = Array.isArray(body?.metadata?.violationCodes)
    ? body.metadata.violationCodes.filter((value: unknown): value is string => typeof value === "string").slice(0, 20)
    : []

  await logAuditEvent({
    userId: user.id,
    action,
    metadata: {
      source: typeof body?.metadata?.source === "string" ? body.metadata.source.slice(0, 80) : "editor",
      requiredPlan: typeof body?.metadata?.requiredPlan === "string" ? body.metadata.requiredPlan : null,
      violationCodes,
      violationCount: violationCodes.length,
    },
    request,
  })

  return NextResponse.json({ success: true })
}
