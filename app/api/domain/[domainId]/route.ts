import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { addDomainToVercel, removeDomainFromVercel } from "@/lib/vercel-domains"

type RouteContext = { params: Promise<{ domainId: string }> }

async function getOwnedDomain(domainId: string, userId: string) {
  const supabase = await createClient()
  const { data: domain } = await supabase
    .from("website_domains")
    .select("id, website_id, domain, is_primary, status, last_error, created_at")
    .eq("id", domainId)
    .maybeSingle()
  if (!domain) return { supabase, domain: null }

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("id", domain.website_id)
    .eq("user_id", userId)
    .maybeSingle()
  return { supabase, domain: website ? domain : null }
}

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { domainId } = await context.params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""
  const owned = await getOwnedDomain(domainId, user.id)
  if (!owned.domain) return NextResponse.json({ error: "Domein niet gevonden." }, { status: 404 })
  const domain = owned.domain

  if (action === "makePrimary") {
    if (domain.status !== "active") {
      return NextResponse.json({ error: "Alleen een actief domein kan primair worden gemaakt." }, { status: 409 })
    }
    const { data, error } = await owned.supabase.rpc("set_website_primary_domain", {
      p_website_id: domain.website_id,
      p_domain_id: domain.id,
    })
    if (error || !data) return NextResponse.json({ error: error?.message || "Primair domein kon niet worden gewijzigd." }, { status: 500 })

    await logAuditEvent({
      userId: user.id,
      websiteId: domain.website_id,
      action: "domain.primary_changed",
      metadata: { domain: domain.domain },
      request,
    })
    return NextResponse.json({ success: true })
  }

  if (action === "retryAdd") {
    if (!["add_failed", "provisioning"].includes(domain.status)) {
      return NextResponse.json({ error: "Dit domein hoeft niet opnieuw toegevoegd te worden." }, { status: 409 })
    }
    const vercel = await addDomainToVercel(domain.domain)
    if (!vercel.success) {
      await owned.supabase
        .from("website_domains")
        .update({ status: "add_failed", last_error: vercel.error })
        .eq("id", domain.id)
      return NextResponse.json({ error: vercel.error || "Opnieuw toevoegen is mislukt." }, { status: vercel.skipped ? 503 : 502 })
    }

    const { error } = await owned.supabase
      .from("website_domains")
      .update({ status: "active", last_error: null })
      .eq("id", domain.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { count } = await owned.supabase
      .from("website_domains")
      .select("id", { count: "exact", head: true })
      .eq("website_id", domain.website_id)
      .eq("status", "active")
    if (count === 1) {
      await owned.supabase.rpc("set_website_primary_domain", {
        p_website_id: domain.website_id,
        p_domain_id: domain.id,
      })
    }

    await logAuditEvent({ userId: user.id, websiteId: domain.website_id, action: "domain.added", metadata: { domain: domain.domain, retry: true }, request })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Onbekende domeinactie." }, { status: 400 })
}

export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateLimit = checkRateLimit(getRateLimitKey(request, `domain_delete:${user.id}`), 20, 60 * 60 * 1000)
  if (!rateLimit.allowed) return NextResponse.json({ error: "Te veel verwijderpogingen. Probeer het later opnieuw." }, { status: 429 })

  const { domainId } = await context.params
  const owned = await getOwnedDomain(domainId, user.id)
  if (!owned.domain) return NextResponse.json({ error: "Domein niet gevonden." }, { status: 404 })
  const domain = owned.domain

  const { error: pendingError } = await owned.supabase
    .from("website_domains")
    .update({ status: "removal_pending", last_error: null })
    .eq("id", domain.id)
  if (pendingError) return NextResponse.json({ error: pendingError.message }, { status: 500 })

  await logAuditEvent({
    userId: user.id,
    websiteId: domain.website_id,
    action: "domain.removal_started",
    metadata: { domain: domain.domain, previousStatus: domain.status },
    request,
  })

  const vercel = await removeDomainFromVercel(domain.domain)
  if (!vercel.success) {
    const errorMessage = vercel.error || "Het domein kon niet uit Vercel worden verwijderd."
    await owned.supabase
      .from("website_domains")
      .update({ status: "removal_failed", last_error: errorMessage })
      .eq("id", domain.id)
    await logAuditEvent({
      userId: user.id,
      websiteId: domain.website_id,
      action: "domain.removal_failed",
      metadata: { domain: domain.domain, vercel },
      request,
    })
    return NextResponse.json({ error: errorMessage, status: "removal_failed" }, { status: vercel.skipped ? 503 : 502 })
  }

  const { data: finalized, error: finalizeError } = await owned.supabase.rpc("finalize_website_domain_removal", {
    p_website_id: domain.website_id,
    p_domain_id: domain.id,
  })
  if (finalizeError || finalized !== "removed") {
    return NextResponse.json({ error: finalizeError?.message || "Vercel is bijgewerkt, maar lokale opschoning moet opnieuw worden geprobeerd." }, { status: 500 })
  }

  await logAuditEvent({
    userId: user.id,
    websiteId: domain.website_id,
    action: "domain.removed",
    metadata: { domain: domain.domain, wasPrimary: domain.is_primary, vercelStatus: vercel.status },
    request,
  })
  return NextResponse.json({ success: true })
}
