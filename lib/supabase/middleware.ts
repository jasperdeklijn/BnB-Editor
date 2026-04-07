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
const hostname = host.split(":")[0]

// Preview
if (hostname.startsWith("preview-") && hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
  const slug = hostname
    .replace("preview-", "")
    .replace(`.${PLATFORM_DOMAIN}`, "")

  const url = request.nextUrl.clone()
  url.pathname = `/preview/${slug}`
  return NextResponse.rewrite(url)
}

// Live
if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
  const slug = hostname.replace(`.${PLATFORM_DOMAIN}`, "")

  if (slug !== "www") {
    const url = request.nextUrl.clone()
    url.pathname = `/site/${slug}`
    return NextResponse.rewrite(url)
  }
}
console.log("HOST:", hostname)
  // 3. Custom domain: look up custom_domain in websites table
  const isCustomDomain =
    hostname !== PLATFORM_DOMAIN &&
    hostname !== `www.${PLATFORM_DOMAIN}` &&
    !hostname.endsWith(`.${PLATFORM_DOMAIN}`) &&
    !hostname.includes("localhost") &&
    !hostname.includes("vercel.app")

  if (isCustomDomain) {
    console.log("CUSTOM DOMAIN DETECTED:", hostname)

    const { data: website, error } = await supabase
      .from("websites")
      .select("slug")
      .or(`custom_domain.eq.${hostname},custom_domain.eq.www.${hostname}`)
      .single()

    console.log("DB RESULT:", website, error)
    if (website?.slug) {
      const url = request.nextUrl.clone()
      url.pathname = `/site/${website.slug}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.redirect(new URL("/", request.url))
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
