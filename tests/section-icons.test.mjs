import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import { createRequire } from "node:module"
import { renderToStaticMarkup } from "react-dom/server"
import React from "react"

const require = createRequire(import.meta.url)
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute)
  const compiled = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, fileName: absolute,
  })
  const module = { exports: {} }
  Function("module", "exports", "require", compiled.outputText)(module, module.exports, specifier => {
    if (specifier.includes("inline-editable-text")) return { EditableText: ({ as = "span", value }) => React.createElement(as, null, value) }
    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      const base = specifier.startsWith("@/") ? path.resolve(specifier.slice(2)) : path.resolve(path.dirname(absolute), specifier)
      const target = [base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile())
      return target ? load(target) : {}
    }
    return require(specifier)
  })
  cache.set(absolute, module.exports)
  return module.exports
}

const icons = load("lib/section-icons.ts")
const { SECTION_ICON_IDS } = load("lib/section-icon-ids.ts")
const { SECTION_ICON_CATALOGUE } = load("lib/section-icon-catalogue.ts")
const { SectionIcon } = load("components/sections/section-icon.tsx")
const translations = load("lib/i18n/section-translations.ts")

test("every selectable icon has a local SVG and a unique id", () => {
  assert.equal(SECTION_ICON_IDS.length, 151)
  assert.equal(new Set(SECTION_ICON_IDS).size, SECTION_ICON_IDS.length)
  assert.deepEqual(SECTION_ICON_CATALOGUE.map(icon => icon.id), [...SECTION_ICON_IDS])
  for (const icon of SECTION_ICON_IDS) {
    const svg = fs.readFileSync(`public${icons.sectionIconUrl(icon)}`, "utf8")
    assert.match(svg, /<svg/)
    assert.doesNotMatch(svg, /<script|<foreignObject|onload=|href=/i)
  }
  assert.match(fs.readFileSync("public/icons/tabler/LICENSE.txt", "utf8"), /MIT License/)
})

test("only catalogue identifiers are rendered; no icon removes its badge too", () => {
  for (const input of ["../../etc", "https://external.example/icon.svg", "tabler:missing", {}, undefined]) {
    assert.equal(icons.resolveSectionIcon(input), "tabler:check")
  }
  assert.equal(icons.resolveSectionIcon(null), null)
  assert.equal(icons.resolveSectionIcon(undefined, "tabler:phone"), "tabler:phone")
  assert.equal(renderToStaticMarkup(React.createElement(SectionIcon, { icon: null, badgeClassName: "badge" })), "")
  assert.match(renderToStaticMarkup(React.createElement(SectionIcon, { icon: "tabler:wifi" })), /\/icons\/tabler\/wifi.svg/)
})

test("feature and pricing translations preserve icons and IDs through JSON save/reload and reorder", () => {
  const features = [{ id: "wifi", text: "Gratis wifi", icon: "tabler:wifi" }, { id: "meal", text: "Ontbijt, koffie en thee", icon: null }]
  for (const type of ["features", "pricing"]) {
    const data = type === "features" ? { features } : { plans: [{ id: "plan", name: "Verblijf", features }] }
    const section = JSON.parse(JSON.stringify({ id: "section", type, data, styles: {} }))
    const values = translations.extractTranslatableValues(type, data)
    const translated = type === "features" ? values.features : values.plans[0].features
    assert.equal(translated[0].icon, undefined)
    translated.reverse()
    translated.find(item => item.id === "wifi").text = "Free wifi"
    translated.forEach(item => { item.icon = "tabler:x" })
    const localized = translations.applySectionTranslation(section, values)
    const result = type === "features" ? localized.data.features : localized.data.plans[0].features
    assert.deepEqual(result.map(item => item.id), ["wifi", "meal"])
    assert.deepEqual(result.map(item => item.icon), ["tabler:wifi", null])
    assert.equal(result[0].text, "Free wifi")
    assert.equal(result[1].text, "Ontbijt, koffie en thee")
  }
})

test("all contact layouts use the chosen icons and hide empty badges", () => {
  const { ContactSection } = load("components/sections/contact-section.tsx")
  for (const layout of ["classic", "split", "compact", "card", "showcase", "banner"]) {
    const data = { layout, title: "Contact", address: "Adres", phone: "012345", email: "test@example.com", addressIcon: "tabler:tree", phoneIcon: "tabler:headset", emailIcon: null }
    const html = renderToStaticMarkup(React.createElement(ContactSection, { data, isPreview: true }))
    assert.match(html, /\/icons\/tabler\/headset.svg/, layout)
    assert.doesNotMatch(html, /\/icons\/tabler\/mail.svg/, layout)
    if (layout !== "showcase") assert.match(html, /\/icons\/tabler\/tree.svg/, layout)
  }
})

test("hero and CTA buttons use selected icons across their layouts", () => {
  const { HeroSection } = load("components/sections/hero-section.tsx")
  const { CtaSection } = load("components/sections/cta-section.tsx")
  for (const layout of ["classic", "split", "compact", "card", "showcase", "banner"]) {
    for (const [Component, field, textField] of [[HeroSection, "ctaIcon", "ctaText"], [CtaSection, "primaryCtaIcon", "primaryCtaText"]]) {
      const data = { title: "Welkom", layout, [textField]: "Reserveer", [field]: "tabler:calendar" }
      const render = () => renderToStaticMarkup(React.createElement(Component, { data, isPreview: true }))
      assert.match(render(), /\/icons\/tabler\/calendar.svg/, `${field}: ${layout}`)
      data[field] = null
      assert.doesNotMatch(render(), /\/icons\/tabler\//, `${field}: ${layout}`)
    }
  }
})

test("footer, location, opening hours, forms, and FAQ render custom and hidden icons", () => {
  const cases = [
    ["footer", "FooterSection", { showCompanyInfo: true, phone: "012345" }, "phoneIcon"],
    ["map", "MapSection", { phone: "012345" }, "phoneIcon"],
    ["opening-hours", "OpeningHoursSection", {}, "headingIcon"],
    ["request-form", "RequestFormSection", { requestType: "appointment" }, "headingIcon"],
    ["request-form", "RequestFormSection", { requestType: "whatsapp", whatsappNumber: "31612345678" }, "headingIcon"],
  ]
  for (const [file, name, extra, field] of cases) {
    const Component = load(`components/sections/${file}-section.tsx`)[name]
    const data = { title: "Titel", ...extra, [field]: "tabler:star" }
    const render = () => renderToStaticMarkup(React.createElement(Component, { data, isPreview: true }))
    assert.match(render(), /\/icons\/tabler\/star.svg/, file)
    data[field] = null
    assert.doesNotMatch(render(), /\/icons\/tabler\/star.svg/, file)
  }
  const { FaqSection } = load("components/sections/faq-section.tsx")
  const section = { id: "faq", type: "faq", data: { title: "Vragen", items: [{ id: "pets", question: "Huisdieren?", answer: "Ja", icon: "tabler:paw" }] } }
  const translated = translations.applySectionTranslation(section, { items: [{ id: "pets", question: "Pets?", answer: "Yes", icon: "tabler:x" }] })
  const html = renderToStaticMarkup(React.createElement(FaqSection, { data: translated.data, isPreview: true }))
  assert.match(html, /\/icons\/tabler\/paw.svg/)
  assert.match(html, /Pets\?/)
  assert.match(html, /chevron-down/)
})
