import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { PLATFORM_BASE_URL, PLATFORM_DOMAIN } from "@/lib/platform"
import { isOnboardingEnabled } from "@/lib/onboarding/config"

const platformDomain = PLATFORM_DOMAIN.toLowerCase().replace(/^www\./, "")
const platformHosts = new Set([platformDomain, `www.${platformDomain}`])
const websiteLocaleByPath = new Map([["en", "en-GB"], ["de", "de-DE"], ["fr", "fr-FR"]])

function rewriteWebsite(request: NextRequest, url: URL) {
  const firstSegment = request.nextUrl.pathname.split("/").filter(Boolean)[0] ?? ""
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-website-locale", websiteLocaleByPath.get(firstSegment) ?? "nl-NL")
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
}
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
  if (isAssetOrApiRequest(request.nextUrl.pathname)) {
    return supabaseResponse
  }

  const slug = hostname
    .replace("preview-", "")
    .replace(`.${platformDomain}`, "")
  const visitorPath = request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  // Authentication cookies created on the platform host are not guaranteed to
  // be available on a preview subdomain. Route signed-out visitors through the
  // canonical platform login and return them to the same private preview path.
  const {
    data: { user: previewUser },
  } = await supabase.auth.getUser()
  if (!previewUser) {
    const loginUrl = new URL("/auth/login", PLATFORM_BASE_URL)
    loginUrl.searchParams.set("next", `/preview/${slug}${visitorPath}`)
    return NextResponse.redirect(loginUrl)
  }

  const url = request.nextUrl.clone()
  url.pathname = `/preview/${slug}${visitorPath}`
  return rewriteWebsite(request, url)
}

// Live
if (hostname.endsWith(`.${platformDomain}`)) {
  const slug = hostname.replace(`.${platformDomain}`, "")

  if (slug !== "www") {
    if (isAssetOrApiRequest(request.nextUrl.pathname)) return supabaseResponse
    const url = request.nextUrl.clone()
    const visitorPath = request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
    url.pathname = `/site/${slug}${visitorPath}`
    return rewriteWebsite(request, url)
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
      return rewriteWebsite(request, url)
    }

    return NextResponse.redirect(new URL(request.nextUrl.pathname || "/", `https://${platformDomain}`))
  }

  const internalWebsiteLocale = request.nextUrl.pathname.match(/^\/(?:site|preview)\/[^/]+\/(en|de|fr)(?:\/|$)/)?.[1]
  if (internalWebsiteLocale) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-website-locale", websiteLocaleByPath.get(internalWebsiteLocale) ?? "nl-NL")
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // 4. Normal app routing — enforce auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const requiresAuthentication =
    request.nextUrl.pathname === "/editor" ||
    request.nextUrl.pathname.startsWith("/editor/") ||
    request.nextUrl.pathname === "/admin" ||
    request.nextUrl.pathname.startsWith("/admin/") ||
    request.nextUrl.pathname === "/onboarding"
  const requiresRecoverySession = request.nextUrl.pathname === "/auth/update-password"

  if ((requiresAuthentication || requiresRecoverySession) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = requiresRecoverySession ? "/auth/forgot-password" : "/auth/login"
    if (request.nextUrl.pathname === "/onboarding") url.searchParams.set("next", "/onboarding")
    return NextResponse.redirect(url)
  }

  if (user && isOnboardingEnabled()) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle()

    if (!profileError) {
      const onboardingIncomplete = !profile?.onboarding_completed_at
      const isAuthPage = ["/auth", "/auth/login", "/auth/sign-up", "/auth/sign-up-success"].includes(request.nextUrl.pathname)

      if (request.nextUrl.pathname === "/onboarding" && !onboardingIncomplete) {
        return NextResponse.redirect(new URL("/editor", request.url))
      }
      if (isAuthPage) {
        return NextResponse.redirect(new URL(onboardingIncomplete ? "/onboarding" : "/editor", request.url))
      }
      if (requiresAuthentication && request.nextUrl.pathname !== "/onboarding" && onboardingIncomplete) {
        const onboardingUrl = new URL("/onboarding", request.url)
        onboardingUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`)
        return NextResponse.redirect(onboardingUrl)
      }
    }
  }

  return supabaseResponse
}




