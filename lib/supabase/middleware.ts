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

  // 3. Custom domain: look up custom_domain in websites table
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

    const { data: website, error } = await supabase
      .from("websites")
      .select("slug")
      .or(`custom_domain.eq.${hostname},custom_domain.eq.www.${hostname}`)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Custom domain lookup failed:", error)
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

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/api") &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/editor-demo.mp4") &&
    !request.nextUrl.pathname.startsWith("/legal") &&
    !request.nextUrl.pathname.startsWith("/site") &&
    !request.nextUrl.pathname.startsWith("/preview") &&
    !request.nextUrl.pathname.startsWith("/sitemap.xml")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}




