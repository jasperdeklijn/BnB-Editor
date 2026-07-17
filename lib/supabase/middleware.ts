import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { PLATFORM_DOMAIN } from "@/lib/platform"

const platformDomain = PLATFORM_DOMAIN.toLowerCase().replace(/^www\./, "")
const platformHosts = new Set([platformDomain, `www.${platformDomain}`])
function isAssetOrApiRequest(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
const host = request.headers.get("host") || ""
const hostname = host.split(":")[0].toLowerCase()

// Preview
if (hostname.startsWith("preview-") && hostname.endsWith(`.${platformDomain}`)) {
  if (isAssetOrApiRequest(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith("/auth")) {
    return supabaseResponse
  }

  const slug = hostname
    .replace("preview-", "")
    .replace(`.${platformDomain}`, "")

  const url = request.nextUrl.clone()
  url.pathname = `/preview/${slug}`
  return NextResponse.rewrite(url)
}

// Live
if (hostname.endsWith(`.${platformDomain}`)) {
  const slug = hostname.replace(`.${platformDomain}`, "")

  if (slug !== "www") {
    const url = request.nextUrl.clone()
    url.pathname = `/site/${slug}`
    return NextResponse.rewrite(url)
  }
}

  // 3. Custom domain: resolve any active domain attached to a published website.
  const isCustomDomain =
    !platformHosts.has(hostname) &&
    !hostname.endsWith(`.${platformDomain}`) &&
    !hostname.includes("localhost") &&
    !hostname.includes("vercel.app")

  if (isCustomDomain) {
    // Don't rewrite API routes, static assets, or other non-page requests
    if (isAssetOrApiRequest(request.nextUrl.pathname)) {
      // Let these requests pass through normally
      return supabaseResponse
    }

    const normalizedHostname = hostname.replace(/^www\./, "")
    const { data: websiteDomain, error: domainError } = await supabase
      .from("website_domains")
      .select("website_id")
      .eq("domain", normalizedHostname)
      .eq("status", "active")
      .maybeSingle()

    const { data: website, error: websiteError } = websiteDomain
      ? await supabase
          .from("websites")
          .select("slug")
          .eq("id", websiteDomain.website_id)
          .eq("published", true)
          .maybeSingle()
      : { data: null, error: null }

    if (domainError || websiteError) {
      console.error("Custom domain lookup failed:", domainError || websiteError)
    }

    if (website?.slug) {
      const url = request.nextUrl.clone()
      url.pathname = `/site/${website.slug}${request.nextUrl.pathname}`
      return NextResponse.rewrite(url)
    }

    return NextResponse.redirect(new URL(request.nextUrl.pathname || "/", `https://${platformDomain}`))
  }

  // 4. Normal app routing — enforce auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const requiresAuthentication =
    request.nextUrl.pathname === "/editor" ||
    request.nextUrl.pathname.startsWith("/editor/") ||
    request.nextUrl.pathname === "/admin" ||
    request.nextUrl.pathname.startsWith("/admin/")

  if (requiresAuthentication && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}




