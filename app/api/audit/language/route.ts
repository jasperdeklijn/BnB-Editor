import { NextResponse } from "next/server"

import { logAuditEvent, type AuditAction } from "@/lib/audit-log"
import { isSupportedWebsiteLocale } from "@/lib/i18n/locales"
import { createClient } from "@/lib/supabase/server"

const allowed = new Set<AuditAction>([
  "language.added", "language.updated", "language.removed", "language.enabled", "language.disabled",
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : ""
  const locale = typeof body?.locale === "string" && isSupportedWebsiteLocale(body.locale) ? body.locale : null
  const action = typeof body?.action === "string" && allowed.has(body.action as AuditAction) ? body.action as AuditAction : null
  if (!websiteId || !locale || !action) return NextResponse.json({ error: "Invalid audit event" }, { status: 400 })

  const { data: website } = await supabase.from("websites").select("id").eq("id", websiteId).eq("user_id", user.id).maybeSingle()
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 })

  await logAuditEvent({ userId: user.id, websiteId, action, metadata: { locale }, request })
  return NextResponse.json({ success: true })
}
