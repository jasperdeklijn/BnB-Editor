import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

type TemplateCheckpoint = {
  version?: number
  scope?: string
  pageId?: string
  websiteId?: string
  businessId?: string | null
  sections?: Array<Record<string, unknown>>
  transitions?: Array<Record<string, unknown>>
  services?: Array<Record<string, unknown>>
  locales?: Array<Record<string, unknown>>
  sectionTranslations?: Array<Record<string, unknown>>
  businessTranslations?: Array<Record<string, unknown>>
  serviceTranslations?: Array<Record<string, unknown>>
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const checkpoint = body?.checkpoint as TemplateCheckpoint | undefined
    if (!checkpoint?.websiteId) {
      return NextResponse.json({ error: "Restore point is missing a website" }, { status: 400 })
    }
    if (checkpoint.version === 3 && checkpoint.scope === "page" && checkpoint.pageId) {
      const { error } = await supabase.rpc("restore_page_checkpoint", { p_website_id: checkpoint.websiteId, p_page_id: checkpoint.pageId, p_checkpoint: checkpoint })
      if (error) return NextResponse.json({ error: error.message }, { status: 422 })
      return NextResponse.json({ success: true, websiteId: checkpoint.websiteId, pageId: checkpoint.pageId })
    }
    return NextResponse.json({ error: "Dit herstelpunt gebruikt een verouderd formaat." }, { status: 400 })

  } catch (error) {
    console.error("Error restoring template checkpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
