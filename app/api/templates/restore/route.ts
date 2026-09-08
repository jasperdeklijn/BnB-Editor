import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

type TemplateCheckpoint = {
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

    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, business_id")
      .eq("id", checkpoint.websiteId)
      .eq("user_id", user.id)
      .single()
    if (websiteError || !website) return NextResponse.json({ error: "Website not found" }, { status: 404 })

    if (checkpoint.businessId) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", checkpoint.businessId)
        .eq("user_id", user.id)
        .single()
      if (businessError || !business) return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    const normalizedCheckpoint = {
      sections: checkpoint.sections ?? [],
      transitions: checkpoint.transitions ?? [],
      services: checkpoint.services ?? [],
      locales: checkpoint.locales ?? [],
      sectionTranslations: checkpoint.sectionTranslations ?? [],
      businessTranslations: checkpoint.businessTranslations ?? [],
      serviceTranslations: checkpoint.serviceTranslations ?? [],
    }
    const { data, error } = await supabase.rpc("restore_template_transaction", {
      p_website_id: checkpoint.websiteId,
      p_business_id: checkpoint.businessId ?? website.business_id ?? null,
      p_checkpoint: normalizedCheckpoint,
    } as never)
    if (error) {
      console.error("Atomic template restore failed:", error)
      return NextResponse.json({ error: "Failed to restore template atomically" }, { status: 500 })
    }

    const result = (data ?? {}) as { sectionsCount?: number; servicesCount?: number }
    return NextResponse.json({
      success: true,
      websiteId: checkpoint.websiteId,
      businessId: checkpoint.businessId ?? website.business_id ?? null,
      sectionsCount: result.sectionsCount ?? normalizedCheckpoint.sections.length,
      servicesCount: result.servicesCount ?? normalizedCheckpoint.services.length,
    })
  } catch (error) {
    console.error("Error restoring template checkpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
