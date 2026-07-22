import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { removeDomainFromVercel } from "@/lib/vercel-domains"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, `website_delete:${user.id}`), 5, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Te veel verwijderpogingen. Probeer het later opnieuw." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : ""
  if (!websiteId) {
    return NextResponse.json({ error: "Website ontbreekt" }, { status: 400 })
  }

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, title, slug")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (websiteError || !website) {
    return NextResponse.json({ error: "Website niet gevonden" }, { status: 404 })
  }

  const { data: domains, error: domainsError } = await supabase
    .from("website_domains")
    .select("domain")
    .eq("website_id", website.id)

  if (domainsError) {
    console.error("[WebsiteDelete] Failed to read website domains", {
      websiteId: website.id,
      code: domainsError.code,
      message: domainsError.message,
    })
    return NextResponse.json({ error: "Domeinen konden niet worden gecontroleerd." }, { status: 500 })
  }

  const domainCleanup = await Promise.all((domains ?? []).map((domain) => removeDomainFromVercel(domain.domain)))
  const failedDomainIndex = domainCleanup.findIndex((result) => !result.success)
  if (failedDomainIndex >= 0) {
    return NextResponse.json(
      {
        error: `Website kon niet worden verwijderd omdat ${(domains ?? [])[failedDomainIndex]?.domain ?? "een domein"} niet uit Vercel kon worden verwijderd.`,
      },
      { status: 502 },
    )
  }

  const { error: deleteError } = await supabase
    .from("websites")
    .delete()
    .eq("id", website.id)
    .eq("user_id", user.id)

  if (deleteError) {
    console.error("[WebsiteDelete] Database deletion failed", {
      websiteId: website.id,
      code: deleteError.code,
      message: deleteError.message,
      details: deleteError.details,
      hint: deleteError.hint,
    })
    return NextResponse.json({ error: "Website kon niet worden verwijderd." }, { status: 500 })
  }

  await logAuditEvent({
    userId: user.id,
    action: "website.deleted",
    metadata: {
      deletedWebsiteId: website.id,
      title: website.title,
      slug: website.slug,
      domains: (domains ?? []).map((domain) => domain.domain),
      domainCleanup,
    },
    request,
  })

  return NextResponse.json({ success: true })
}
