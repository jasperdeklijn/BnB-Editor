import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"

const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const { PLATFORM_BASE_URL } = load("lib/platform.ts")
const { MARKETING_DEMOS } = load("lib/marketing-demos.ts")
const { publishedWebsiteBaseUrl } = load("lib/seo/site-urls.ts")

function compile(file, imports) {
  const module = { exports: {} }
  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  Function("module", "exports", "require", js)(module, module.exports, (id) => {
    if (id in imports) return imports[id]
    return id.startsWith("@/") ? load(`${id.slice(2)}.ts`) : require(id)
  })
  return module.exports
}

function fixture({ domain = null, published = true, multilingual = true, error = null } = {}) {
  const locales = [{ locale: "nl-NL", pathSegment: "nl", isDefault: true, sections: [] }, { locale: "en-GB", pathSegment: "en", isDefault: false, sections: [] }]
  const snapshot = {
    version: 3, publishedAt: "2026-10-15T10:00:00Z", draftVersion: "version-1",
    website: { id: "website-1", customDomain: domain }, sections: [], transitions: [], services: [], availabilityWindows: [], sharedSections: [], redirects: [], locales,
    pages: [{ id: "home", slug: "", isHome: true }, { id: "about", slug: "over-ons", isHome: false }].map(page => ({
      ...page, websiteId: "website-1", includeInPublication: true, title: page.id, sections: [], transitions: [],
      locales: locales.map(locale => ({ locale: locale.locale, title: page.id, seo: {}, sections: [] })),
    })),
  }
  const website = { published, live_snapshot: snapshot }
  const queries = []
  const client = { rpc(name, args) { queries.push({ name, args }); return { maybeSingle: async () => ({ data: website, error }) } } }
  const imports = {
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/i18n/feature": { isMultilingualWebsitesEnabled: () => multilingual },
    "@/lib/analytics/public-settings": { publicAnalyticsSettings: async () => ({ advancedAllowed: false }) },
    "@/lib/demos/server": { publicDemo: async () => null },
    "@/components/page-loader": {}, "@/components/demos/demo-site": {},
  }
  const sitemap = compile("app/site/[slug]/sitemap.xml/route.ts", imports)
  const robots = compile("app/site/[slug]/robots.txt/route.ts", imports)
  const metadata = compile("app/site/[slug]/[[...path]]/page.tsx", imports)
  const context = { params: Promise.resolve({ slug: "studio-groen" }) }
  return { sitemap, robots, metadata, context, queries, snapshot }
}

test("platform sitemap includes every marketing example and public canonical page", async () => {
  const urls = (await load("app/sitemap.ts").default()).map(entry => entry.url)
  for (const path of ["", "/pricing", "/legal", "/terms", "/privacy", "/cookies", "/processor-agreement", "/acceptable-use", "/disclaimer", "/melding-onrechtmatige-content", "/status", ...MARKETING_DEMOS.map(demo => `/voorbeelden/${demo.slug}`)]) {
    assert.ok(urls.includes(`${PLATFORM_BASE_URL}${path}`), path)
  }
  assert.equal(new Set(urls).size, urls.length)
  assert.ok(urls.every(url => !/\/(auth|editor|admin|preview|booking|aanvraag)(\/|$)/.test(url)))
  const robots = load("app/robots.ts").default()
  assert.ok(robots.rules.allow.includes("/"))
  assert.equal(robots.sitemap, `${PLATFORM_BASE_URL}/sitemap.xml`)
})

test("marketing examples expose indexable metadata and their own canonical URLs", async () => {
  const imports = Object.fromEntries(["hero", "about", "pricing", "faq"].map(name => [`@/components/sections/${name}-section`, {}]))
  const page = compile("app/voorbeelden/[slug]/page.tsx", imports)
  for (const demo of MARKETING_DEMOS) {
    const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: demo.slug }) })
    assert.deepEqual(metadata.robots, { index: true, follow: true })
    assert.equal(metadata.alternates.canonical, `/voorbeelden/${demo.slug}`)
    assert.ok(metadata.description.includes(demo.description))
    assert.match(metadata.description, /Fictieve demo, geen klantcase/)
    assert.match(metadata.description, /Aanvragen en boekingen zijn uitgeschakeld/)
    assert.equal(metadata.openGraph.url, `/voorbeelden/${demo.slug}`)
    assert.equal(metadata.twitter.description, metadata.description)
  }
})

test("published sitemap, robots and page canonicals agree on subdomain and custom domain", async () => {
  for (const domain of [null, "studio.example.test"]) {
    const f = fixture({ domain })
    const base = publishedWebsiteBaseUrl("studio-groen", domain)
    const response = await f.sitemap.GET(new Request(`${base}/sitemap.xml`), f.context)
    assert.equal(response.status, 200)
    const xml = await response.text()
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
    assert.deepEqual(urls, [`${base}/`, `${base}/en`, `${base}/over-ons`, `${base}/en/over-ons`])
    assert.match(xml, /xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml"/)
    assert.equal((xml.match(/hreflang="x-default"/g) || []).length, 4)
    assert.equal((xml.match(/<lastmod>2026-10-15T10:00:00Z<\/lastmod>/g) || []).length, 4)
    for (const path of [[], ["en"], ["over-ons"], ["en", "over-ons"]]) {
      const metadata = await f.metadata.generateMetadata({ params: Promise.resolve({ slug: "studio-groen", path }) })
      assert.ok(urls.includes(metadata.alternates.canonical))
      assert.deepEqual(metadata.robots, { index: true, follow: true })
    }
    const robots = await f.robots.GET(new Request(`${base}/robots.txt`), f.context)
    assert.ok((await robots.text()).includes(`Sitemap: ${base}/sitemap.xml`))
    assert.ok(f.queries.every(query => query.name === "get_public_website" && query.args.p_slug === "studio-groen" && query.args.p_domain === null))
  }
})

test("disabled languages and unpublished pages are excluded; failed lookups return retryable errors", async () => {
  const single = fixture({ multilingual: false })
  const xml = await (await single.sitemap.GET(new Request("https://example.test/sitemap.xml"), single.context)).text()
  assert.equal((xml.match(/<loc>/g) || []).length, 2)
  assert.doesNotMatch(xml, /hreflang="en-GB"/)
  const unpublished = fixture({ published: false })
  assert.equal((await unpublished.sitemap.GET(new Request("https://example.test/sitemap.xml"), unpublished.context)).status, 404)
  assert.match(await (await unpublished.robots.GET(new Request("https://example.test/robots.txt"), unpublished.context)).text(), /Disallow: \//)
  const failed = fixture({ error: { message: "Database unavailable" } })
  for (const route of [failed.sitemap, failed.robots]) {
    const response = await route.GET(new Request("https://example.test/"), failed.context)
    assert.equal(response.status, 503)
    assert.equal(response.headers.get("Retry-After"), "60")
  }
})
