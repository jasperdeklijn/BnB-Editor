// Run against next start: node scripts/check-marketing-seo.mjs http://localhost:3100
import assert from "node:assert/strict"
import fs from "node:fs"
import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { load } from "cheerio"
import robotsParser from "robots-parser"

const origin = process.argv[2] || "http://localhost:3100"
const routes = ["/", "/website-maken", "/website-voor-zzp", "/website-overstappen", "/website-voor-bnb", "/voorbeelden", "/pricing", "/voorbeelden/bnb", "/voorbeelden/coach", "/voorbeelden/hovenier"]
const report = []
const titles = new Set()
const descriptions = new Set()
const assets = new Set()
const internalLinks = new Set()
let canonicalOrigin
for (const route of routes) {
  console.log(`Checking ${route}`)
  const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(120000) })
  assert.equal(response.status, 200, route)
  assert.match(response.headers.get("content-type"), /text\/html/)
  const html = await response.text()
  const $ = load(html)
  assert.equal($("h1").length, 1, `${route}: exactly one H1`)
  assert.ok($("main").text().trim().length > 250, `${route}: server-rendered content`)
  const title = $("title").text()
  const description = $('meta[name="description"]').attr("content")
  assert.ok(title && description, route)
  assert.ok(!titles.has(title), `${route}: duplicate title ${title}`)
  titles.add(title)
  descriptions.add(description)
  const canonical = new URL($('link[rel="canonical"]').attr("href"))
  canonicalOrigin ??= canonical.origin
  assert.equal(canonical.origin, canonicalOrigin, route)
  assert.equal(canonical.pathname, route, route)
  assert.equal(new URL($('meta[property="og:url"]').attr("content")).href, canonical.href)
  assert.ok($('meta[name="twitter:title"]').attr("content"), route)
  assert.doesNotMatch($('meta[name="robots"]').attr("content") || "", /noindex/)
  const schemas = $('script[type="application/ld+json"]').toArray().flatMap(el => JSON.parse($(el).text()))
  if (route === "/") {
    assert.ok(schemas.some(s => s["@type"] === "Organization"))
    assert.ok(schemas.some(s => s["@type"] === "WebSite"))
    assert.equal($('iframe[title*="demo"]').length, 1)
    assert.ok($('a[href^="https://app.supademo.com/demo/"]').length)
  } else {
    const breadcrumb = schemas.find(s => s["@type"] === "BreadcrumbList")
    assert.ok(breadcrumb, route)
    assert.equal(breadcrumb.itemListElement.at(-1).item, canonical.href)
  }
  assert.ok(schemas.every(s => !s.offers && !s.aggregateRating), "no hidden offers or invented ratings")
  if (route.includes("voorbeelden")) assert.match($("main").text() + $("aside").text(), /fictie[fv]/i)
  if (!route.startsWith("/voorbeelden/")) assert.doesNotMatch($("body").text(), /€\s*\d+[,.]\d{2}/, "test phase hides all monetary tariffs")
  $("img").each((_, el) => { assert.ok($(el).attr("alt")); assets.add($(el).attr("src")) })
  $('link[rel="stylesheet"],script[src]').each((_, el) => assets.add($(el).attr("href") || $(el).attr("src")))
  $('a[href^="/"]').each((_, el) => internalLinks.add($(el).attr("href").split(/[?#]/)[0] || "/"))
  report.push({ route, status: response.status, title, description, canonical: canonical.href, h1: $("h1").text(), bytes: Buffer.byteLength(html) })
}
assert.equal(titles.size, routes.length, "unique titles")
assert.equal(descriptions.size, routes.length, "unique descriptions")
for (const asset of assets) {
  if (!asset?.startsWith("/")) continue
  const response = await fetch(new URL(asset, origin), { method: "HEAD", signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 200, asset)
}
// Check public navigation destinations without following private account routes.
const publicPaths = [...internalLinks].filter(route => !/^\/(auth|editor)(\/|$)/.test(route))
for (const route of publicPaths) {
  if (routes.includes(route)) continue
  const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, `internal link ${route}`)
}
const sitemapResponse = await fetch(new URL("/sitemap.xml", origin))
assert.equal(sitemapResponse.status, 200)
assert.match(sitemapResponse.headers.get("content-type"), /xml/)
const sitemap = load(await sitemapResponse.text(), { xmlMode: true })
const locations = sitemap("loc").toArray().map(el => sitemap(el).text())
for (const route of routes) assert.ok(locations.some(url => new URL(url).pathname === route), `sitemap ${route}`)
assert.ok(locations.every(url => !/^\/(api|auth|admin|editor|preview|site|booking|reviews|onboarding|aanvraag)(\/|$)/.test(new URL(url).pathname)))
const robotsResponse = await fetch(new URL("/robots.txt", origin))
assert.equal(robotsResponse.status, 200)
assert.match(robotsResponse.headers.get("content-type"), /text\/plain/)
const robotsText = await robotsResponse.text()
assert.equal(new URL(robotsText.match(/^Sitemap: (.+)$/m)[1]).href, `${canonicalOrigin}/sitemap.xml`)
const robots = robotsParser(`${canonicalOrigin}/robots.txt`, robotsText)
for (const bot of ["Googlebot", "Bingbot", "OAI-SearchBot"]) for (const route of routes) assert.equal(robots.isAllowed(new URL(route, canonicalOrigin).href, bot), true)
for (const bot of ["Googlebot", "Bingbot", "OAI-SearchBot"]) {
  const response = await fetch(new URL("/website-maken", origin), { headers: { "user-agent": bot } })
  assert.equal(response.status, 200, bot)
  assert.doesNotMatch(response.headers.get("x-robots-tag") || "", /noindex/i, bot)
}
// Native request preserves an explicit Host header; fetch can replace it with its URL authority.
const wwwResponse = await new Promise((resolve, reject) => {
  const request = (new URL(origin).protocol === "https:" ? httpsRequest : httpRequest)(new URL("/website-maken?utm_source=qa", origin), {
    headers: { host: `www.${new URL(canonicalOrigin).hostname}` },
  }, response => {
    response.resume()
    resolve({ status: response.statusCode, location: response.headers.location })
  })
  request.on("error", reject)
  request.setTimeout(30000, () => request.destroy(new Error("www HTTP check timed out")))
  request.end()
})
assert.equal(wwwResponse.status, 308)
assert.equal(wwwResponse.location, `${canonicalOrigin}/website-maken?utm_source=qa`)
fs.mkdirSync("artifacts/marketing-seo", { recursive: true })
fs.writeFileSync("artifacts/marketing-seo/http-report.json", JSON.stringify({ origin, pages: report, assetsChecked: assets.size, discoveredLinkedPaths: internalLinks.size, publicLinksChecked: publicPaths.length, sitemapUrls: locations.length, robots: robotsText, crawlerRequests: "Googlebot, Bingbot, OAI-SearchBot: HTTP 200", wwwRedirect: wwwResponse.location }, null, 2))
console.log(`PASS: ${routes.length} HTML routes, ${assets.size} assets, ${publicPaths.length} public linked paths, sitemap, robots, crawler requests and www redirect. Report: artifacts/marketing-seo/http-report.json`)
