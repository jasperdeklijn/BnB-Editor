import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

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
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : null

  if (!websiteId) {
    return NextResponse.json({ error: "Missing websiteId" }, { status: 400 })
  }

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, title, slug")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .single()

  if (websiteError || !website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }

  await logAuditEvent({
    userId: user.id,
    websiteId: website.id,
    action: "website.created",
    metadata: {
      title: website.title,
      slug: website.slug,
    },
    request,
  })

  return NextResponse.json({ success: true })
}
