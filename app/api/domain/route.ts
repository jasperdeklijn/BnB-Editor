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

  console.log('[Vercel Domain] Starting domain management', {
    slug,
    normalized,
    currentDomain,
    hasVercelToken: !!vercelToken,
    hasVercelProjectId: !!vercelProjectId,
    tokenLength: vercelToken?.length,
  })

  if (vercelToken && vercelProjectId) {
    try {
      // If adding a new domain
      if (normalized && normalized !== currentDomain) {
        const url = `https://api.vercel.com/v7/domains?projectId=${vercelProjectId}`
        console.log('[Vercel Domain] Adding domain to Vercel', {
          domain: normalized,
          url,
        })

        const addResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'add',
            name: normalized,
            cdnEnabled: true,
            zone: true,
          }),
        })

        console.log('[Vercel Domain] Add response status:', addResponse.status)

        if (!addResponse.ok) {
          const errorData = await addResponse.json()
          console.error('[Vercel Domain] Failed to add domain to Vercel:', {
            status: addResponse.status,
            statusText: addResponse.statusText,
            error: errorData,
          })
        } else {
          const successData = await addResponse.json()
          console.log('[Vercel Domain] Successfully added domain to Vercel:', {
            domain: normalized,
            response: successData,
          })
        }
      } else if (normalized && normalized === currentDomain) {
        console.log('[Vercel Domain] No domain change detected; current domain already matches normalized value', {
          currentDomain,
          normalized,
        })
      }

      // If removing a domain
      if (!normalized && currentDomain) {
        const url = `https://api.vercel.com/v7/domains/${currentDomain}?projectId=${vercelProjectId}`
        console.log('[Vercel Domain] Removing domain from Vercel', {
          domain: currentDomain,
          url,
        })

        const deleteResponse = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
          },
        })

        console.log('[Vercel Domain] Delete response status:', deleteResponse.status)

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json()
          console.error('[Vercel Domain] Failed to remove domain from Vercel:', {
            status: deleteResponse.status,
            statusText: deleteResponse.statusText,
            error: errorData,
          })
        } else {
          console.log('[Vercel Domain] Successfully removed domain from Vercel:', {
            domain: currentDomain,
          })
        }
      }

      if (!normalized && !currentDomain) {
        console.log('[Vercel Domain] No domain change - skipping Vercel API call')
      }
    } catch (vercelError) {
      console.error('[Vercel Domain] Exception during Vercel API call:', {
        error: vercelError instanceof Error ? vercelError.message : String(vercelError),
        stack: vercelError instanceof Error ? vercelError.stack : undefined,
      })
    }
  } else {
    console.warn('[Vercel Domain] Vercel credentials not configured', {
      hasToken: !!vercelToken,
      hasProjectId: !!vercelProjectId,
    })
  }

  return NextResponse.json({ success: true, customDomain: normalized })
}
