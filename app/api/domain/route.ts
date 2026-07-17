import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { addDomainToVercel, normalizeDomain, validateDomain } from "@/lib/vercel-domains"

function serializeDomain(row: {
  id: string
  website_id: string
  domain: string
  is_primary: boolean
  status: string
  last_error: string | null
  created_at: string
}) {
  return {
    id: row.id,
    websiteId: row.website_id,
    domain: row.domain,
    isPrimary: row.is_primary,
    status: row.status,
    lastError: row.last_error,
    createdAt: row.created_at,
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const websiteId = new URL(request.url).searchParams.get("websiteId")
  if (!websiteId) return NextResponse.json({ error: "Website ontbreekt." }, { status: 400 })

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!website) return NextResponse.json({ error: "Website niet gevonden." }, { status: 404 })

  const { data, error } = await supabase
    .from("website_domains")
    .select("id, website_id, domain, is_primary, status, last_error, created_at")
    .eq("website_id", websiteId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ domains: (data ?? []).map(serializeDomain) })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateLimit = checkRateLimit(getRateLimitKey(request, `domain_add:${user.id}`), 12, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Te veel domeinpogingen. Probeer het later opnieuw." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : ""
  const normalized = normalizeDomain(typeof body?.domain === "string" ? body.domain : null)
  const validationError = validateDomain(normalized)
  if (!websiteId || validationError) {
    return NextResponse.json({ error: validationError || "Website ontbreekt." }, { status: 400 })
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id, slug")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!website) return NextResponse.json({ error: "Website niet gevonden." }, { status: 404 })

  const { data: inserted, error: insertError } = await supabase
    .from("website_domains")
    .insert({ website_id: websiteId, domain: normalized, status: "provisioning" })
    .select("id, website_id, domain, is_primary, status, last_error, created_at")
    .single()

  if (insertError) {
    const duplicate = insertError.code === "23505"
    return NextResponse.json(
      { error: duplicate ? "Dit domein is al aan een website gekoppeld." : insertError.message },
      { status: duplicate ? 409 : 500 },
    )
  }

  const vercel = await addDomainToVercel(normalized!)
  if (!vercel.success) {
    const errorMessage = vercel.error || "Het domein kon niet aan Vercel worden toegevoegd."
    const { data: failed } = await supabase
      .from("website_domains")
      .update({ status: "add_failed", last_error: errorMessage })
      .eq("id", inserted.id)
      .select("id, website_id, domain, is_primary, status, last_error, created_at")
      .single()

    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "domain.add_failed",
      metadata: { domain: normalized, slug: website.slug, vercel },
      request,
    })
    return NextResponse.json(
      { error: errorMessage, domain: serializeDomain(failed ?? { ...inserted, status: "add_failed", last_error: errorMessage }) },
      { status: vercel.skipped ? 503 : 502 },
    )
  }

  const { data: active, error: activateError } = await supabase
    .from("website_domains")
    .update({ status: "active", last_error: null })
    .eq("id", inserted.id)
    .select("id, website_id, domain, is_primary, status, last_error, created_at")
    .single()
  if (activateError || !active) {
    return NextResponse.json({ error: "Domein is aan Vercel toegevoegd, maar kon lokaal niet worden geactiveerd." }, { status: 500 })
  }

  const { count } = await supabase
    .from("website_domains")
    .select("id", { count: "exact", head: true })
    .eq("website_id", websiteId)
    .eq("status", "active")

  let result = active
  if (count === 1) {
    const { data: primarySet } = await supabase.rpc("set_website_primary_domain", {
      p_website_id: websiteId,
      p_domain_id: active.id,
    })
    if (primarySet) result = { ...active, is_primary: true }
  }

  await logAuditEvent({
    userId: user.id,
    websiteId,
    action: "domain.added",
    metadata: { domain: normalized, slug: website.slug, isPrimary: result.is_primary },
    request,
  })

  return NextResponse.json({ success: true, domain: serializeDomain(result) }, { status: 201 })
}
