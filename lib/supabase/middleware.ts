import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PLATFORM_DOMAIN = "bnbwebsitemaken.nl"

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
  const hostname = host.split(":")[0] // strip port for local dev

  // 1. Preview subdomain: preview-[slug].bnbwebsitemaken.nl
  const previewMatch = hostname.match(
    new RegExp(`^preview-(.+)\\.${PLATFORM_DOMAIN.replace(".", "\\.")}$`)
  )
  if (previewMatch) {
    const slug = previewMatch[1]
    const url = request.nextUrl.clone()
    url.pathname = `/preview/${slug}`
    return NextResponse.rewrite(url)
  }

  // 2. Live subdomain: [slug].bnbwebsitemaken.nl
  const liveMatch = hostname.match(
    new RegExp(`^(.+)\\.${PLATFORM_DOMAIN.replace(".", "\\.")}$`)
  )
  if (liveMatch) {
    const slug = liveMatch[1]
    // Exclude the bare platform domain itself and www
    if (slug !== "www") {
      const url = request.nextUrl.clone()
      url.pathname = `/site/${slug}`
      return NextResponse.rewrite(url)
    }
  }

  // 3. Custom domain: look up custom_domain in websites table
  const isCustomDomain =
    hostname !== PLATFORM_DOMAIN &&
    hostname !== `www.${PLATFORM_DOMAIN}` &&
    !hostname.endsWith(`.${PLATFORM_DOMAIN}`) &&
    !hostname.includes("localhost") &&
    !hostname.includes("vercel.app")

  if (isCustomDomain) {
    const { data: website } = await supabase
      .from("websites")
      .select("slug")
      .or(`custom_domain.eq.${hostname},custom_domain.eq.www.${hostname}`)
      .single()

    if (website?.slug) {
      const url = request.nextUrl.clone()
      url.pathname = `/site/${website.slug}`
      return NextResponse.rewrite(url)
    }
  }

  // 4. Normal app routing — enforce auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
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
