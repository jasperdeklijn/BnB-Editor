import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/domain — save a custom domain for the current user's website
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { slug, customDomain } = body as { slug: string; customDomain: string | null }

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  // Normalize: strip protocol, www and trailing slash
  const normalized = customDomain
    ? customDomain
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/$/, "")
        .toLowerCase()
    : null

  // Get current custom domain to see if changed
  const { data: website } = await supabase
    .from("websites")
    .select("custom_domain")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single()

  const currentDomain = website?.custom_domain

  const { error } = await supabase
    .from("websites")
    .update({ custom_domain: normalized })
    .eq("slug", slug)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Handle Vercel domain management
  const vercelToken = process.env.VERCEL_ACCESS_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID

  if (vercelToken && vercelProjectId) {
    try {
      // If adding a new domain
      if (normalized && normalized !== currentDomain) {
        const addResponse = await fetch(`https://api.vercel.com/v10/domains?projectId=${vercelProjectId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: normalized }),
        })

        if (!addResponse.ok) {
          const errorData = await addResponse.json()
          console.error('Failed to add domain to Vercel:', errorData)
          // Don't fail the request, just log
        }
      }

      // If removing a domain
      if (!normalized && currentDomain) {
        const deleteResponse = await fetch(`https://api.vercel.com/v10/domains/${currentDomain}?projectId=${vercelProjectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
          },
        })

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json()
          console.error('Failed to remove domain from Vercel:', errorData)
          // Don't fail the request
        }
      }
    } catch (vercelError) {
      console.error('Vercel API error:', vercelError)
      // Continue without failing
    }
  }

  return NextResponse.json({ success: true, customDomain: normalized })
}
