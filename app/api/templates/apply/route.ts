import { createClient } from "@/lib/supabase/server"
import {
  generateSectionsFromTemplate,
  getBizDefaultsFromTemplate,
  getDemoServicesFromTemplate,
} from "@/lib/business/template-factory"
import type { BusinessCategory } from "@/lib/business/categories"
import { getTemplatePreset } from "@/components/templates/category-presets"
import { applyThemeDefaultsToSections } from "@/lib/themes"
import type { ThemeConfig } from "@/lib/themes"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { category, websiteId, businessId } = body as {
      category: BusinessCategory
      websiteId?: string
      businessId?: string
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    const businessDefaults = getBizDefaultsFromTemplate(category)
    let resolvedBusinessId = businessId

    if (!resolvedBusinessId) {
      const { data: existingBusiness, error: businessFetchError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (businessFetchError) {
        return NextResponse.json({ error: "Failed to load business" }, { status: 500 })
      }

      if (existingBusiness) {
        resolvedBusinessId = existingBusiness.id
        const { error: businessUpdateError } = await supabase
          .from("businesses")
          .update(businessDefaults)
          .eq("id", resolvedBusinessId)

        if (businessUpdateError) {
          return NextResponse.json({ error: "Failed to update business" }, { status: 500 })
        }
      } else {
        const { data: createdBusiness, error: businessCreateError } = await supabase
          .from("businesses")
          .insert({ user_id: user.id, ...businessDefaults })
          .select("id")
          .single()

        if (businessCreateError || !createdBusiness) {
          return NextResponse.json({ error: "Failed to create business" }, { status: 500 })
        }

        resolvedBusinessId = createdBusiness.id
      }
    }

    let resolvedWebsiteId = websiteId
    if (!resolvedWebsiteId) {
      const { data: existingWebsite } = await supabase
        .from("websites")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingWebsite) {
        resolvedWebsiteId = existingWebsite.id
        await supabase
          .from("websites")
          .update({ business_id: resolvedBusinessId || null, updated_at: new Date().toISOString() })
          .eq("id", resolvedWebsiteId)
      } else {
        const { data: website, error } = await supabase
          .from("websites")
          .insert({
            user_id: user.id,
            title: "Mijn website",
            slug: `website-${Date.now()}`,
            business_id: resolvedBusinessId || null,
          })
          .select("id")
          .single()

        if (error || !website) {
          return NextResponse.json({ error: "Failed to create website" }, { status: 500 })
        }

        resolvedWebsiteId = website.id
      }
    }

    if (resolvedWebsiteId && resolvedBusinessId) {
      const appliedTemplate = getTemplatePreset(category)
      const { error: websiteLinkError } = await supabase
        .from("websites")
        .update({
          business_id: resolvedBusinessId,
          applied_template_id: appliedTemplate?.id ?? category,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedWebsiteId)
        .eq("user_id", user.id)

      if (websiteLinkError) {
        return NextResponse.json({ error: "Failed to update website" }, { status: 500 })
      }
    }

    const { data: websiteTheme, error: websiteThemeError } = await supabase
      .from("websites")
      .select("business_id, theme_config")
      .eq("id", resolvedWebsiteId)
      .eq("user_id", user.id)
      .single()

    if (websiteThemeError) {
      return NextResponse.json({ error: "Failed to load website theme" }, { status: 500 })
    }

    const { data: currentSections, error: currentSectionsError } = await supabase
      .from("website_sections")
      .select("id, type, content, styles, position")
      .eq("website_id", resolvedWebsiteId)
      .order("position", { ascending: true })

    if (currentSectionsError) {
      return NextResponse.json({ error: "Failed to create restore point" }, { status: 500 })
    }

    const currentSectionIds = (currentSections || []).map((section) => section.id)
    const { data: currentTransitions, error: currentTransitionsError } = currentSectionIds.length > 0
      ? await supabase
          .from("section_transitions")
          .select("from_section_id, to_section_id, transition")
          .eq("website_id", resolvedWebsiteId)
          .in("from_section_id", currentSectionIds)
      : { data: [], error: null }

    if (currentTransitionsError) {
      return NextResponse.json({ error: "Failed to create restore point" }, { status: 500 })
    }

    const { data: currentServices, error: currentServicesError } = resolvedBusinessId
      ? await supabase
          .from("services")
          .select("id, business_id, title, description, price, duration, capacity, image_urls, tags, position, is_featured")
          .eq("business_id", resolvedBusinessId)
          .order("position", { ascending: true })
      : { data: [], error: null }

    if (currentServicesError) {
      return NextResponse.json({ error: "Failed to create restore point" }, { status: 500 })
    }

    const [{ data: currentLocales }, { data: currentSectionTranslations }, { data: currentBusinessTranslations }, { data: currentServiceTranslations }] = await Promise.all([
      supabase.from("website_locales").select("*").eq("website_id", resolvedWebsiteId),
      supabase.from("website_section_translations").select("*").eq("website_id", resolvedWebsiteId),
      resolvedBusinessId
        ? supabase.from("business_translations").select("*").eq("business_id", resolvedBusinessId)
        : Promise.resolve({ data: [] }),
      (currentServices ?? []).length
        ? supabase.from("service_translations").select("*").in("service_id", (currentServices ?? []).map((service) => service.id))
        : Promise.resolve({ data: [] }),
    ])

    const checkpoint = {
      websiteId: resolvedWebsiteId,
      businessId: resolvedBusinessId ?? websiteTheme.business_id ?? null,
      sections: currentSections || [],
      transitions: currentTransitions || [],
      services: currentServices || [],
      locales: currentLocales || [],
      sectionTranslations: currentSectionTranslations || [],
      businessTranslations: currentBusinessTranslations || [],
      serviceTranslations: currentServiceTranslations || [],
    }

    const themeConfig = (websiteTheme.theme_config as ThemeConfig | null) ?? null
    const sections = applyThemeDefaultsToSections(
      generateSectionsFromTemplate(category, resolvedBusinessId),
      themeConfig
    )

    await supabase.from("website_sections").delete().eq("website_id", resolvedWebsiteId)

    const { error: sectionsError } = await supabase
      .from("website_sections")
      .insert(
        sections.map((section, position) => ({
          website_id: resolvedWebsiteId,
          type: section.type,
          content: section.data,
          styles: section.styles || {},
          position: position + 1,
        }))
      )

    if (sectionsError) {
      return NextResponse.json({ error: "Failed to create sections" }, { status: 500 })
    }

    if (resolvedBusinessId) {
      await supabase.from("services").delete().eq("business_id", resolvedBusinessId)
      const demoServices = getDemoServicesFromTemplate(category, resolvedBusinessId)

      if (demoServices.length > 0) {
        const { error: servicesError } = await supabase.from("services").insert(demoServices)

        if (servicesError) {
          console.warn("Failed to insert demo services:", servicesError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      websiteId: resolvedWebsiteId,
      businessId: resolvedBusinessId,
      sectionsCount: sections.length,
      checkpoint,
    })
  } catch (error) {
    console.error("Error applying template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
