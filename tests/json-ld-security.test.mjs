import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "cheerio"
import { loadTypeScript } from "./helpers/load-typescript.mjs"

const { serializeJsonLd } = loadTypeScript("lib/seo/json-ld.ts")
const { buildLocalBusinessJsonLd } = loadTypeScript("lib/business/structured-data.ts")

test("business JSON-LD stays one inert script and round-trips hostile text", () => {
  const payload = '</ScRiPt><script>globalThis.compromised=true</script><img src=x onerror=alert(1)>'
  const data = buildLocalBusinessJsonLd({ name: payload, description: payload, city: payload }, "https://example.invalid")
  const html = renderToStaticMarkup(React.createElement("script", {
    type: "application/ld+json", dangerouslySetInnerHTML: { __html: serializeJsonLd(data) },
  }))
  const $ = load(html)
  assert.equal($("script").length, 1)
  assert.equal($("script").attr("type"), "application/ld+json")
  assert.equal($("img").length, 0)
  assert.deepEqual(JSON.parse($("script").text()), JSON.parse(JSON.stringify(data)))
  assert.match(readFileSync("components/page-loader.tsx", "utf8"), /__html: serializeJsonLd\(jsonLd\)/)
})
