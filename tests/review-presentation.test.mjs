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
const { TestimonialsSection } = load("components/sections/testimonials-section.tsx")

test("collection copy is editable on the canvas, including the hidden form, but not in preview", () => {
  const props = { data: { reviewMode: "collection" }, isPreview: false, websiteId: "test", onUpdate() {} }
  const editor = renderToStaticMarkup(React.createElement(TestimonialsSection, props))
  for (const field of presentation.REVIEW_FORM_FIELDS) {
    assert.ok(editor.includes(`aria-label="Tekst bewerken: ${field.defaultValue}"`), field.key)
  }
  assert.doesNotMatch(editor, /<button type="submit"(?! disabled)/)
  const hidden = renderToStaticMarkup(React.createElement(TestimonialsSection, { ...props, data: { ...props.data, reviewFormOnWebsite: false } }))
  assert.match(hidden, /Tekst bewerken: Deel je ervaring/)
  const preview = renderToStaticMarkup(React.createElement(TestimonialsSection, { ...props, isPreview: true }))
  assert.doesNotMatch(preview, /data-inline-editable="true"/)
  const hiddenPreview = renderToStaticMarkup(React.createElement(TestimonialsSection, { ...props, isPreview: true, data: { ...props.data, reviewFormOnWebsite: false } }))
  assert.doesNotMatch(hiddenPreview, /voorbeeld losse recensiepagina|type="radio"/)
})

test("Google button can be edited before adding a link, without exposing a dead public link", () => {
  const props = { data: { reviewMode: "google" }, isPreview: false, onUpdate() {} }
  const editor = renderToStaticMarkup(React.createElement(TestimonialsSection, props))
  assert.match(editor, /aria-label="Tekst bewerken: Lees onze recensies op Google"/)
  const publicHtml = renderToStaticMarkup(React.createElement(TestimonialsSection, { ...props, onUpdate: undefined, websiteId: "test" }))
  assert.doesNotMatch(publicHtml, /href="#"|data-inline-editable="true"/)
  assert.match(publicHtml, /Recensies volgen binnenkort/)
})

test("review section honors the same background and color settings as other sections", () => {
  const html = renderToStaticMarkup(React.createElement(TestimonialsSection, {
    data: { reviewMode: "collection" }, isPreview: true,
    styles: { backgroundImage: "/test-background.jpg", backgroundPosition: "top", accentColor: "#123456", surfaceColor: "#abcdef" },
  }))
  assert.match(html, /background-image:url\(\/test-background.jpg\)/)
  assert.match(html, /background-position:top/)
  assert.match(html, /--section-accent:#123456/)
  assert.match(html, /--section-surface:#abcdef/)
})

test("hiding the embedded form preserves the review section and standalone form", () => {
  const data = { reviewMode: "collection", reviewFormOnWebsite: false, title: "Onze recensies", layout: "split" }
  const hidden = renderToStaticMarkup(React.createElement(TestimonialsSection, { data, isPreview: true, websiteId: "test" }))
  assert.match(hidden, /Onze recensies/)
  assert.doesNotMatch(hidden, /type="radio"|lg:grid-cols-2/)
  const shown = renderToStaticMarkup(React.createElement(TestimonialsSection, { data: { ...data, reviewFormOnWebsite: true }, isPreview: true, websiteId: "test" }))
  assert.equal((shown.match(/type="radio"/g) ?? []).length, 5)
  const standalone = presentation.getPublishedReviewPresentation({ sections: [{ type: "testimonials", data }] })
  const html = renderToStaticMarkup(React.createElement(ReviewForm, { websiteId: "test", available: true, data: standalone.data }))
  assert.equal((html.match(/type="radio"/g) ?? []).length, 5)
})

test("email invitation opens a recipient-free draft with an encoded review link", () => {
  const link = "https://flexpagina.nl/reviews/test"
  const mailto = new URL(presentation.getReviewInvitationMailto("A & B", link))
  assert.equal(mailto.protocol, "mailto:")
  assert.equal(mailto.pathname, "")
  assert.equal(mailto.searchParams.get("subject"), "Deel je ervaring met A & B")
  assert.ok(mailto.searchParams.get("body").includes(link))
  assert.deepEqual([...mailto.searchParams.keys()], ["subject", "body"])
})

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
