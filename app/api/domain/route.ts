import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

function normalizeDomain(domain: string | null | undefined) {
  return domain
    ? domain
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/.*$/, "")
        .toLowerCase()
    : null
}

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
  const slug = typeof body?.slug === "string" ? body.slug : null
  const customDomain = typeof body?.customDomain === "string" ? body.customDomain : null

  if (!websiteId && !slug) {
    return NextResponse.json({ error: "Missing websiteId" }, { status: 400 })
  }

  const normalized = normalizeDomain(customDomain)

  let websiteQuery = supabase
    .from("websites")
    .select("id, slug, custom_domain")
    .eq("user_id", user.id)

  websiteQuery = websiteId ? websiteQuery.eq("id", websiteId) : websiteQuery.eq("slug", slug)

  const { data: website, error: websiteError } = await websiteQuery.single()

  if (websiteError || !website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }

  const currentDomain = website.custom_domain

  const { error } = await supabase
    .from("websites")
    .update({ custom_domain: normalized, updated_at: new Date().toISOString() })
    .eq("id", website.id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (normalized !== currentDomain) {
    await logAuditEvent({
      userId: user.id,
      websiteId: website.id,
      action: normalized ? "domain.added" : "domain.removed",
      metadata: {
        previousDomain: currentDomain,
        domain: normalized,
        slug: website.slug,
      },
      request,
    })
  }

  const vercelToken = process.env.VERCEL_ACCESS_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID

  console.log("[Vercel Domain] Starting domain management", {
    websiteId: website.id,
    slug: website.slug,
    normalized,
    currentDomain,
    hasVercelToken: !!vercelToken,
    hasVercelProjectId: !!vercelProjectId,
  })

  if (vercelToken && vercelProjectId) {
    try {
      if (normalized && normalized !== currentDomain) {
        const url = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`
        const addResponse = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: normalized }),
        })

        if (!addResponse.ok) {
          const errorData = await addResponse.json().catch(() => null)
          console.error("[Vercel Domain] Failed to add domain to Vercel:", {
            status: addResponse.status,
            statusText: addResponse.statusText,
            error: errorData,
          })
        }
      }

      if (!normalized && currentDomain) {
        const url = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${encodeURIComponent(currentDomain)}`
        const deleteResponse = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
          },
        })

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => null)
          console.error("[Vercel Domain] Failed to remove domain from Vercel:", {
            status: deleteResponse.status,
            statusText: deleteResponse.statusText,
            error: errorData,
          })
        }
      }
    } catch (vercelError) {
      console.error("[Vercel Domain] Exception during Vercel API call:", {
        error: vercelError instanceof Error ? vercelError.message : String(vercelError),
        stack: vercelError instanceof Error ? vercelError.stack : undefined,
      })
    }
  } else {
    console.warn("[Vercel Domain] Vercel credentials not configured", {
      hasToken: !!vercelToken,
      hasProjectId: !!vercelProjectId,
    })
  }

  return NextResponse.json({ success: true, customDomain: normalized })
}
