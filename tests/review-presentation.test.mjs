import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url), cache = new Map()
function load(file) {
  const resolved = path.resolve(file)
  if (cache.has(resolved)) return cache.get(resolved)
  const m = { exports: {} }
  const output = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  Function("module", "exports", "require", output)(m, m.exports, (specifier) => {
    if (specifier.startsWith("@/")) {
      const base = specifier.slice(2)
      return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`)
    }
    return require(specifier)
  })
  cache.set(resolved, m.exports)
  return m.exports
}
const presentation = load("lib/reviews/presentation.ts")
const { ReviewForm } = load("components/reviews/review-form.tsx")

test("review form settings have safe defaults and bound editable copy", () => {
  const result = presentation.getReviewFormSettings({ reviewFormTitle: "  Mijn formulier  ", reviewNameLabel: {}, reviewFormIntro: "x".repeat(900), reviewSubmitLabel: " " })
  assert.equal(result.reviewFormTitle, "Mijn formulier")
  assert.equal(result.reviewNameLabel, "Naam bij je recensie")
  assert.equal(result.reviewFormIntro.length, 500)
  assert.equal(result.reviewSubmitLabel, "Recensie versturen")
})

test("standalone form takes only presentation fields from the published collection section", () => {
  const result = presentation.getPublishedReviewPresentation({ sections: [
    { type: "testimonials", data: { reviewMode: "google", reviewFormTitle: "Wrong mode" } },
    { type: "testimonials", data: { reviewMode: "collection", reviewFormTitle: "Published title", layout: "split", styleType: "dark", recipientEmail: "private@example.test", items: ["Private archive"] }, styles: { accentColor: "#385344" } },
  ] })
  assert.equal(result.data.reviewFormTitle, "Published title")
  assert.equal(result.data.layout, "split")
  assert.equal(result.data.styleType, "dark")
  assert.equal(result.styles.accentColor, "#385344")
  assert.doesNotMatch(JSON.stringify(result), /Private archive|private@example/)
  assert.equal(new Set(["clean", "bold", "elegant", "soft", "dark", "outline"].map(presentation.getReviewPanelClass)).size, 6)
})

test("form renders required native star radios, editable labels, branding and isolated IDs", () => {
  const props = { websiteId: "test", available: true, data: { reviewFormTitle: "Mijn formulier", reviewSubmitLabel: "Verstuur ervaring" } }
  const html = renderToStaticMarkup(React.createElement("div", null, React.createElement(ReviewForm, props), React.createElement(ReviewForm, { ...props, preview: true })))
  assert.equal((html.match(/type="radio"/g) ?? []).length, 10)
  for (const label of ["1 ster", "2 sterren", "3 sterren", "4 sterren", "5 sterren"]) assert.ok(html.includes(`aria-label="${label}"`))
  assert.match(html, /Mijn formulier/)
  assert.match(html, /Verstuur ervaring/)
  assert.match(html, /Mogelijk gemaakt door/)
  assert.match(html, /FlexPagina/)
  assert.match(html, /type="submit" disabled=""/)
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length)
  const unavailable = renderToStaticMarkup(React.createElement(ReviewForm, { websiteId: "test", available: false }))
  assert.doesNotMatch(unavailable, /type="radio"/)
  assert.match(unavailable, /Link om toestemming in te trekken/)
})
