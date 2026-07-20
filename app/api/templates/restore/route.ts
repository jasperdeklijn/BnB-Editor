import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

type TemplateCheckpoint = {
  websiteId?: string
  businessId?: string | null
  sections?: Array<{
    id: string
    type: string
    content?: Record<string, unknown>
    styles?: Record<string, unknown>
    position: number
  }>
  transitions?: Array<{
    from_section_id: string
    to_section_id: string
    transition?: Record<string, unknown> | null
  }>
  services?: Array<{
    id: string
    business_id: string
    title?: string
    description?: string
    price?: string
    duration?: string
    capacity?: number | null
    image_urls?: unknown[]
    tags?: unknown[]
    position?: number
    is_featured?: boolean
  }>
  locales?: Array<Record<string, unknown>>
  sectionTranslations?: Array<Record<string, unknown>>
  businessTranslations?: Array<Record<string, unknown>>
  serviceTranslations?: Array<Record<string, unknown>>
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

    if (websiteError || !website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 })
    }

    if (checkpoint.businessId) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", checkpoint.businessId)
        .eq("user_id", user.id)
        .single()

      if (businessError || !business) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 })
      }

      if (website.business_id !== checkpoint.businessId) {
        const { error: websiteUpdateError } = await supabase
          .from("websites")
          .update({ business_id: checkpoint.businessId, updated_at: new Date().toISOString() })
          .eq("id", checkpoint.websiteId)
          .eq("user_id", user.id)

        if (websiteUpdateError) {
          return NextResponse.json({ error: "Failed to reconnect website" }, { status: 500 })
        }
      }
    }

    const sections = checkpoint.sections || []
    const transitions = checkpoint.transitions || []
    const services = checkpoint.services || []
    const locales = checkpoint.locales || []
    const sectionTranslations = checkpoint.sectionTranslations || []
    const businessTranslations = checkpoint.businessTranslations || []
    const serviceTranslations = checkpoint.serviceTranslations || []

    const { error: deleteSectionsError } = await supabase
      .from("website_sections")
      .delete()
      .eq("website_id", checkpoint.websiteId)

    if (deleteSectionsError) {
      return NextResponse.json({ error: "Failed to clear current sections" }, { status: 500 })
    }

    if (sections.length > 0) {
      const { error: insertSectionsError } = await supabase
        .from("website_sections")
        .insert(
          sections.map((section) => ({
            id: section.id,
            website_id: checkpoint.websiteId,
            type: section.type,
            content: section.content || {},
            styles: section.styles || {},
            position: section.position,
          })),
        )

      if (insertSectionsError) {
        return NextResponse.json({ error: "Failed to restore sections" }, { status: 500 })
      }
    }

    if (transitions.length > 0) {
      const sectionIds = new Set(sections.map((section) => section.id))
      const validTransitions = transitions.filter(
        (transition) =>
          sectionIds.has(transition.from_section_id) &&
          sectionIds.has(transition.to_section_id),
      )

      if (validTransitions.length > 0) {
        const { error: insertTransitionsError } = await supabase
          .from("section_transitions")
          .insert(
            validTransitions.map((transition) => ({
              website_id: checkpoint.websiteId,
              from_section_id: transition.from_section_id,
              to_section_id: transition.to_section_id,
              transition: transition.transition ?? null,
            })),
          )

        if (insertTransitionsError) {
          return NextResponse.json({ error: "Failed to restore transitions" }, { status: 500 })
        }
      }
    }

    if (checkpoint.businessId) {
      const { error: deleteServicesError } = await supabase
        .from("services")
        .delete()
        .eq("business_id", checkpoint.businessId)

      if (deleteServicesError) {
        return NextResponse.json({ error: "Failed to clear current services" }, { status: 500 })
      }

      if (services.length > 0) {
        const { error: insertServicesError } = await supabase
          .from("services")
          .insert(
            services.map((service) => ({
              id: service.id,
              business_id: checkpoint.businessId,
              title: service.title || "",
              description: service.description || "",
              price: service.price || "",
              duration: service.duration || "",
              capacity: service.capacity ?? null,
              image_urls: service.image_urls || [],
              tags: service.tags || [],
              position: service.position ?? 0,
              is_featured: service.is_featured ?? false,
            })),
          )

        if (insertServicesError) {
          return NextResponse.json({ error: "Failed to restore services" }, { status: 500 })
        }
      }
    }

    if (locales.length > 0) {
      const { error } = await supabase
        .from("website_locales")
        .upsert(locales.map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...locale }) => locale), { onConflict: "website_id,locale" })
      if (error) return NextResponse.json({ error: "Failed to restore website languages" }, { status: 500 })
    }

    if (sectionTranslations.length > 0) {
      const { error } = await supabase
        .from("website_section_translations")
        .upsert(sectionTranslations.map(({ created_at: _createdAt, updated_at: _updatedAt, ...translation }) => translation), { onConflict: "section_id,locale" })
      if (error) return NextResponse.json({ error: "Failed to restore section translations" }, { status: 500 })
    }

    if (businessTranslations.length > 0) {
      const { error } = await supabase
        .from("business_translations")
        .upsert(businessTranslations.map(({ created_at: _createdAt, updated_at: _updatedAt, ...translation }) => translation), { onConflict: "business_id,locale" })
      if (error) return NextResponse.json({ error: "Failed to restore business translations" }, { status: 500 })
    }

    if (serviceTranslations.length > 0) {
      const { error } = await supabase
        .from("service_translations")
        .upsert(serviceTranslations.map(({ created_at: _createdAt, updated_at: _updatedAt, ...translation }) => translation), { onConflict: "service_id,locale" })
      if (error) return NextResponse.json({ error: "Failed to restore service translations" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      websiteId: checkpoint.websiteId,
      businessId: checkpoint.businessId ?? null,
      sectionsCount: sections.length,
      servicesCount: services.length,
    })
  } catch (error) {
    console.error("Error restoring template checkpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
