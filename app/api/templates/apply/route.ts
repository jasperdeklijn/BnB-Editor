import { createClient } from "@/lib/supabase/server"
import {
  generateSectionsFromTemplate,
  getBizDefaultsFromTemplate,
  getDemoServicesFromTemplate,
} from "@/lib/business/template-factory"
import type { BusinessCategory } from "@/lib/business/categories"
import { getTemplatePreset } from "@/components/templates/category-presets"
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

    if (!category || !getTemplatePreset(category)) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    if (businessId) {
      const { data: ownedBusiness, error: businessOwnershipError } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (businessOwnershipError || !ownedBusiness) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 })
      }
    }

    if (websiteId) {
      const { data: ownedWebsite, error: websiteOwnershipError } = await supabase
        .from("websites")
        .select("id")
        .eq("id", websiteId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (websiteOwnershipError || !ownedWebsite) {
        return NextResponse.json({ error: "Website not found" }, { status: 404 })
      }
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

    // Keep theme-derived colors implicit. Persisting the resolved palette here
    // would turn it into section overrides and prevent later theme changes from
    // updating the generated sections.
    const sections = generateSectionsFromTemplate(category, resolvedBusinessId)
    if (!resolvedBusinessId) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }
    const demoServices = getDemoServicesFromTemplate(category, resolvedBusinessId)
    const appliedTemplate = getTemplatePreset(category)
    const { error: transactionError } = await supabase.rpc("apply_template_transaction", {
      p_website_id: resolvedWebsiteId,
      p_business_id: resolvedBusinessId,
      p_applied_template_id: appliedTemplate?.id ?? category,
      p_business_defaults: businessDefaults,
      p_sections: sections,
      p_services: demoServices,
    } as never)

    if (transactionError) {
      console.error("Atomic template apply failed:", transactionError)
      return NextResponse.json({ error: "Failed to apply template atomically" }, { status: 500 })
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
