import { NextResponse } from "next/server"
import dns from "node:dns/promises"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { normalizeDomain, validateDomain } from "@/lib/vercel-domains"

const VERCEL_IP = "76.76.21.21"
const VERCEL_CNAMES = new Set(["cname.vercel-dns.com", "cname.vercel-dns-0.com"])

// GET /api/domain/verify?domain=mijnbedrijf.nl
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = normalizeDomain(searchParams.get("domain"))
  const websiteId = searchParams.get("websiteId")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, `domain_verify:${user.id}`), 15, 10 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Te veel verificatiepogingen. Probeer het later opnieuw." }, { status: 429 })
  }

  if (!websiteId || !domain || validateDomain(domain)) {
    return NextResponse.json({ error: "Ongeldige domeinverificatie" }, { status: 400 })
  }

  const { data: ownedWebsite } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!ownedWebsite) {
    return NextResponse.json({ error: "Website niet gevonden." }, { status: 404 })
  }

  const apex = domain.trim().replace(/^www\./i, "").toLowerCase()
  const verifiedDomain = await supabase
    .from("website_domains")
    .select("website_id")
    .eq("website_id", websiteId)
    .eq("domain", domain)
    .eq("status", "active")
    .maybeSingle()
    .then(({ data }) => data ?? null)

  if (!verifiedDomain) {
    return NextResponse.json({ error: "Domein niet gevonden." }, { status: 404 })
  }

  const verifiedWebsiteId = ownedWebsite.id

  await logAuditEvent({
    userId: user.id,
    websiteId: verifiedWebsiteId,
    action: "domain.verification_started",
    metadata: { domain, apex },
    request,
  })

  try {
    // Check A record for apex
    const aRecords = await dns.resolve4(domain).catch((): string[] => [])

    if (aRecords.includes(VERCEL_IP)) {
      await logAuditEvent({
        userId: user.id,
        websiteId: verifiedWebsiteId,
        action: "domain.verification_succeeded",
        metadata: { domain, apex, type: "A" },
        request,
      })

      return NextResponse.json({
        connected: true,
        type: "A",
        message: "A record is correctly pointing to Vercel.",
      })
    }

    // Detect Cloudflare / proxy
    if (aRecords.length > 0 && !aRecords.includes(VERCEL_IP)) {
      await logAuditEvent({
        userId: user.id,
        websiteId: verifiedWebsiteId,
        action: "domain.verification_failed",
        metadata: { domain, apex, reason: "unexpected_a_record", aRecords },
        request,
      })

      return NextResponse.json({
        connected: false,
        message:
          "Domain points to another IP (possibly Cloudflare proxy). Disable proxy (DNS only) and try again.",
      })
    }

    // Check CNAME
    const cnameRecords = await dns.resolveCname(domain).catch((): string[] => [])

    if (cnameRecords.some((record) => VERCEL_CNAMES.has(record.toLowerCase().replace(/\.$/, "")))) {
      await logAuditEvent({
        userId: user.id,
        websiteId: verifiedWebsiteId,
        action: "domain.verification_succeeded",
        metadata: { domain, apex, type: "CNAME" },
        request,
      })

      return NextResponse.json({
        connected: true,
        type: "CNAME",
        message: "CNAME is correctly pointing to Vercel.",
      })
    }

    const wwwRecords = await dns.resolveCname(`www.${apex}`).catch(() => [] as string[])
    if (wwwRecords.some((r) => r.toLowerCase().includes("vercel"))) {
      await logAuditEvent({
        userId: user.id,
        websiteId: verifiedWebsiteId,
        action: "domain.verification_succeeded",
        metadata: { domain, apex, type: "WWW_CNAME" },
        request,
      })

      return NextResponse.json({ connected: true, message: "CNAME record is correctly pointing to Vercel." })
    }

    await logAuditEvent({
      userId: user.id,
      websiteId: verifiedWebsiteId,
      action: "domain.verification_failed",
      metadata: { domain, apex, reason: "no_valid_dns_record" },
      request,
    })

    return NextResponse.json({
      connected: false,
      message: `No valid DNS record found yet. Make sure you have added an A record pointing to ${VERCEL_IP} or a CNAME pointing to cname.vercel-dns-0.com.`,
    })
  } catch {
    await logAuditEvent({
      userId: user.id,
      websiteId: verifiedWebsiteId,
      action: "domain.verification_failed",
      metadata: { domain, apex, reason: "dns_resolution_error" },
      request,
    })

    return NextResponse.json({
      connected: false,
      message: "Could not resolve DNS records. The domain may not be registered or DNS has not propagated yet.",
    })
  }
}

