import { createClient } from "@/lib/supabase/server"
import { generateSectionsFromTemplate, getDemoServicesFromTemplate } from "@/lib/business/template-factory"
import type { BusinessCategory } from "@/lib/business/categories"
import websiteSections from "@/lib/supabase/websiteSections"
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

    // Get or create website
    let wid = websiteId
    if (!wid) {
      const { data: website, error } = await supabase
        .from("websites")
        .insert({
          user_id: user.id,
          title: "Mijn website",
          slug: `website-${Date.now()}`,
          business_id: businessId || null,
        })
        .select("id")
        .single()

      if (error) {
        return NextResponse.json({ error: "Failed to create website" }, { status: 500 })
      }

      wid = website.id
    }

    // Generate sections from template
    const sections = generateSectionsFromTemplate(category, businessId)

    // Insert sections into the database
    const { error: sectionsError } = await supabase
      .from("website_sections")
      .insert(
        sections.map((section) => ({
          website_id: wid,
          type: section.type,
          content: section.data,
          styles: section.styles || {},
          position: sections.indexOf(section),
        }))
      )

    if (sectionsError) {
      return NextResponse.json({ error: "Failed to create sections" }, { status: 500 })
    }

    // Add demo services if businessId is provided
    if (businessId) {
      const demoServices = getDemoServicesFromTemplate(category, businessId)

      if (demoServices.length > 0) {
        const { error: servicesError } = await supabase.from("services").insert(demoServices)

        if (servicesError) {
          console.warn("Failed to insert demo services:", servicesError)
          // Don't fail the whole request if services insertion fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      websiteId: wid,
      sectionsCount: sections.length,
    })
  } catch (error) {
    console.error("Error applying template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
