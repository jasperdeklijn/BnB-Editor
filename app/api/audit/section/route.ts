import { NextResponse } from "next/server"
import { logAuditEvent, type AuditAction } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

const allowedActions = new Set<AuditAction>(["section.added", "section.deleted"])

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
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : null
  const sectionId = typeof body?.sectionId === "string" ? body.sectionId : null
  const sectionType = typeof body?.sectionType === "string" ? body.sectionType : null

  if (!action || !allowedActions.has(action) || !websiteId || !sectionId) {
    return NextResponse.json({ error: "Invalid audit event" }, { status: 400 })
  }

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .single()

  if (websiteError || !website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }

  await logAuditEvent({
    userId: user.id,
    websiteId,
    action,
    metadata: {
      sectionId,
      sectionType,
    },
    request,
  })

  return NextResponse.json({ success: true })
}
