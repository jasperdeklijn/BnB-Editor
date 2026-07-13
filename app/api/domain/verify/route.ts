import { NextResponse } from "next/server"
import dns from "node:dns/promises"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

const VERCEL_IP = "76.76.21.21"
const VERCEL_CNAME = "cname.vercel-dns.com"

// GET /api/domain/verify?domain=mijnbedrijf.nl
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get("domain")
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

  if (!domain || !websiteId || domain.length > 253) {
    return NextResponse.json({ error: "Ongeldige domeinverificatie" }, { status: 400 })
  }

  const apex = domain.trim().replace(/^www\./i, "").toLowerCase()
  const verifiedWebsiteId = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .maybeSingle()
    .then(({ data }) => data?.id ?? null)

  if (!verifiedWebsiteId) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }

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

    if (cnameRecords.some((r) => r.toLowerCase() === VERCEL_CNAME)) {
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
      message: `No valid DNS record found yet. Make sure you have added an A record pointing to ${VERCEL_IP} or a CNAME pointing to ${VERCEL_CNAME}.`,
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

