import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"
import robotsParser from "robots-parser"
import { NextRequest } from "next/server.js"
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server.js"
import nextConfig from "../next.config.mjs"

const require = createRequire(import.meta.url)
function loader(mocks = {}) {
  const cache = new Map()
  function load(file) {
    const absolute = path.resolve(file)
    if (cache.has(absolute)) return cache.get(absolute)
    const module = { exports: {} }
    cache.set(absolute, module.exports)
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    Function("module", "exports", "require", code)(module, module.exports, specifier => {
      if (specifier in mocks) return mocks[specifier]
      if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`)
      if (specifier.startsWith(".")) return load(path.resolve(path.dirname(absolute), `${specifier}.ts`))
      return require(specifier)
    })
    return module.exports
  }
  return load
}

const load = loader()
const { MARKETING_PAGES } = load("lib/marketing.ts")
const { PLATFORM_BASE_URL } = load("lib/platform.ts")

test("all marketing routes have distinct metadata and are discoverable in the sitemap", async () => {
  const sitemap = await load("app/sitemap.ts").default()
  const { marketingMetadata, marketingBreadcrumbs } = load("lib/seo/marketing.ts")
  const titles = new Set()
  for (const [route, page] of Object.entries(MARKETING_PAGES)) {
    const metadata = marketingMetadata(route, page.title, page.description)
    titles.add(metadata.title.absolute)
    assert.equal(metadata.alternates.canonical, route)
    assert.equal(metadata.openGraph.url, route)
    assert.equal(metadata.twitter.description, page.description)
    assert.equal(metadata.robots.index, true)
    assert.ok(sitemap.some(entry => new URL(entry.url).pathname === route))
    const crumbs = marketingBreadcrumbs([{ path: route, name: page.label }]).itemListElement
    assert.equal(crumbs[1].item, new URL(route, PLATFORM_BASE_URL).href)
    assert.equal(crumbs[1].position, 2)
  }
  assert.equal(titles.size, 5)
  assert.ok(sitemap.every(entry => !/^\/(api|auth|admin|editor|preview|site|booking|reviews|onboarding|aanvraag)(\/|$)/.test(new URL(entry.url).pathname)))
  assert.equal(sitemap.filter(entry => entry.lastModified).length, 1, "do not invent build-time modification dates")
})

test("public test-access copy follows the actual subscription switch without changing billing", () => {
  for (const enabled of [true, false]) {
    const status = loader({ "@/lib/subscriptions": { DEFAULT_ALL_FEATURES_INCLUDED: enabled } })("lib/marketing.ts")
    if (enabled) {
      assert.match(status.MARKETING_ACCESS_NOTICE, /tijdelijk gratis Gold-toegang/)
      assert.match(status.MARKETING_BOOKING_NOTICE, /tijdelijk inbegrepen/)
      assert.doesNotMatch(status.MARKETING_ACCESS_NOTICE, /Voor publiceren heb je een websitepakket nodig/)
    } else {
      assert.match(status.MARKETING_ACCESS_NOTICE, /Voor publiceren heb je een websitepakket nodig/)
      assert.doesNotMatch(status.MARKETING_BOOKING_NOTICE, /tijdelijk inbegrepen/)
    }
  }
})

test("Google, Bing and OAI search can crawl marketing while private platform routes are excluded", () => {
  const config = load("app/robots.ts").default()
  const rules = config.rules
  const text = `User-agent: ${rules.userAgent}\nAllow: ${rules.allow}\n${rules.disallow.map(p => `Disallow: ${p}`).join("\n")}\n`
  const robots = robotsParser(`${PLATFORM_BASE_URL}/robots.txt`, text)
  for (const bot of ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot"]) {
    for (const route of ["/", ...Object.keys(MARKETING_PAGES), "/pricing", "/voorbeelden/bnb", "/_next/static/app.js"]) {
      assert.equal(robots.isAllowed(new URL(route, PLATFORM_BASE_URL).href, bot), true, `${bot} ${route}`)
    }
    for (const route of ["/editor", "/editor/website", "/auth/login", "/preview/test", "/site/test", "/onboarding", "/aanvraag/private-token", "/reviews/private-token", "/api/account"]) {
      assert.equal(robots.isAllowed(new URL(route, PLATFORM_BASE_URL).href, bot), false, `${bot} ${route}`)
    }
  }
  assert.equal(config.sitemap, `${PLATFORM_BASE_URL}/sitemap.xml`)
  assert.equal(rules.userAgent, "*", "do not introduce a separate GPTBot training decision")
})

test("www canonical redirect preserves path/query and never matches tenant or custom domains", async () => {
  const domain = new URL(PLATFORM_BASE_URL).hostname.replace(/^www\./, "")
  const response = await unstable_getResponseFromNextConfig({ url: `https://www.${domain}/website-maken?utm_source=qa`, nextConfig })
  assert.equal(response.status, 308)
  assert.equal(response.headers.get("location"), `https://${domain}/website-maken?utm_source=qa`)
  for (const host of [domain, `demo.${domain}`, `preview-demo.${domain}`, "klant.example", `wwwX${domain}`, `wwwX${domain.replaceAll(".", "X")}`]) {
    const response = await unstable_getResponseFromNextConfig({ url: `https://${host}/website-maken`, nextConfig })
    assert.equal(response.headers.get("location"), null, host)
  }
})

test("existing proxy preserves public marketing, signed-out auth, preview isolation and tenant locales", async () => {
  const domain = new URL(PLATFORM_BASE_URL).hostname.replace(/^www\./, "")
  const db = {
    auth: { getUser: async () => ({ data: { user: null } }) },
    rpc: () => ({ maybeSingle: async () => ({ data: { slug: "klant" }, error: null }) }),
  }
  const mockLoad = loader({ "@supabase/ssr": { createServerClient: () => db } })
  const { updateSession } = mockLoad("lib/supabase/middleware.ts")
  const request = (host, route) => new NextRequest(`https://${host}${route}`, { headers: { host } })
  for (const route of Object.keys(MARKETING_PAGES)) {
    const result = await updateSession(request(domain, route))
    assert.equal(result.headers.get("location"), null)
    assert.equal(result.headers.get("x-middleware-rewrite"), null)
  }
  assert.equal(new URL((await updateSession(request(domain, "/editor"))).headers.get("location")).pathname, "/auth/login")
  const preview = await updateSession(request(`preview-demo.${domain}`, "/robots.txt"))
  assert.match(await preview.text(), /Disallow: \//)
  assert.equal((await updateSession(request(`preview-demo.${domain}`, "/sitemap.xml"))).status, 404)
  const login = new URL((await updateSession(request(`preview-demo.${domain}`, "/en/contact"))).headers.get("location"))
  assert.equal(login.pathname, "/auth/login")
  assert.equal(login.searchParams.get("next"), "/preview/demo/en/contact")
  for (const route of ["/website-maken", "/robots.txt", "/sitemap.xml", "/en/contact"]) {
    for (const [host, slug] of [[`demo.${domain}`, "demo"], ["klant.example", "klant"]]) {
      const response = await updateSession(request(host, route))
      assert.equal(new URL(response.headers.get("x-middleware-rewrite")).pathname, `/site/${slug}${route}`)
      if (route.startsWith("/en/")) assert.equal(response.headers.get("x-middleware-request-x-website-locale"), "en-GB")
    }
  }
})
