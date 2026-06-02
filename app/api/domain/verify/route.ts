import { NextResponse } from "next/server"
import dns from "node:dns/promises"

const VERCEL_IP = "76.76.21.21"
const VERCEL_CNAME = "cname.vercel-dns.com"

// GET /api/domain/verify?domain=mybnb.com
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get("domain")

  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 })
  }

  // Normalize
  const apex = domain.replace(/^www\./i, "").toLowerCase()

  try {
    // Check A record for apex
    const aRecords = await dns.resolve4(domain).catch((): string[] => [])

if (aRecords.includes(VERCEL_IP)) {
  return NextResponse.json({
    connected: true,
    type: "A",
    message: "A record is correctly pointing to Vercel.",
  })
}

// Detect Cloudflare / proxy
if (aRecords.length > 0 && !aRecords.includes(VERCEL_IP)) {
  return NextResponse.json({
    connected: false,
    message:
      "Domain points to another IP (possibly Cloudflare proxy). Disable proxy (DNS only) and try again.",
  })
}

// Check CNAME
    const cnameRecords = await dns.resolveCname(domain).catch((): string[] => [])

    if (cnameRecords.some((r) => r.toLowerCase() === VERCEL_CNAME)) {
      return NextResponse.json({
        connected: true,
        type: "CNAME",
        message: "CNAME is correctly pointing to Vercel.",
      })
    }
     const wwwRecords = await dns.resolveCname(`www.${apex}`).catch(() => [] as string[])
    if (wwwRecords.some((r) => r.toLowerCase().includes("vercel"))) {
      return NextResponse.json({ connected: true, message: "CNAME record is correctly pointing to Vercel." })
    }

    return NextResponse.json({
      connected: false,
      message: `No valid DNS record found yet. Make sure you have added an A record pointing to ${VERCEL_IP} or a CNAME pointing to ${VERCEL_CNAME}.`,
    })
  } catch {
    return NextResponse.json({
      connected: false,
      message: "Could not resolve DNS records. The domain may not be registered or DNS has not propagated yet.",
    })
  }
}
