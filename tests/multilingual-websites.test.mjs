import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(relativePath)
  const source = fs.readFileSync(sourcePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  })
  const module = { exports: {} }
  Function("module", "exports", "require", compiled.outputText)(module, module.exports, () => ({}))
  return module.exports
}

const locales = loadTypeScriptModule("lib/i18n/locales.ts")
const translations = loadTypeScriptModule("lib/i18n/section-translations.ts")

test("locale path lookup accepts only supported short segments", () => {
  assert.equal(locales.getLocaleByPathSegment("EN")?.locale, "en-GB")
  assert.equal(locales.getLocaleByPathSegment("de")?.locale, "de-DE")
  assert.equal(locales.getLocaleByPathSegment("fr")?.locale, "fr-FR")
  assert.equal(locales.getLocaleByPathSegment("es"), null)
})

test("translation overlays ignore configuration and unknown keys", () => {
  const section = { id: "hero", type: "hero", data: { title: "Bron", ctaHref: "#contact" }, styles: {} }
  const localized = translations.applySectionTranslation(section, {
    title: "Source",
    ctaHref: "https://unsafe.example",
    unknown: "ignored",
  })
  assert.equal(localized.data.title, "Source")
  assert.equal(localized.data.ctaHref, "#contact")
  assert.equal(localized.data.unknown, undefined)
})

test("generated navigation links can be translated by section id", () => {
  const sections = [
    { id: "nav", type: "nav", data: { brandName: "Mijn bedrijf", navLinks: [] }, styles: {} },
    { id: "hero", type: "hero", data: { title: "Welkom" }, styles: {} },
    { id: "about", type: "about", data: { title: "Over ons" }, styles: {} },
  ]
  const source = translations.materializeNavigationTranslationSource(sections[0], sections)
  assert.deepEqual(source.data.navLinks.map((link) => link.label), ["Welkom", "Over ons"])

  const localized = translations.applySectionTranslation(source, {
    brandName: "My company",
    navLinks: [
      { sectionId: "hero", label: "Home" },
      { sectionId: "about", label: "About us" },
    ],
  })
  assert.deepEqual(localized.data.navLinks.map((link) => link.label), ["Home", "About us"])
  assert.equal(translations.getSectionTranslationStatus(source, {
    brandName: "My company",
    navLinks: [
      { sectionId: "hero", label: "Home" },
      { sectionId: "about", label: "" },
    ],
  }).status, "missing")
})

test("repeating translations follow stable ids and preserve shared configuration", () => {
  const section = {
    id: "footer",
    type: "footer",
    styles: {},
    data: {
      columns: [{
        id: "column-1",
        title: "Snel naar",
        links: [
          { id: "link-a", label: "Over", href: "#about" },
          { id: "link-b", label: "Contact", href: "#contact" },
        ],
      }],
    },
  }
  const localized = translations.applySectionTranslation(section, {
    columns: [{
      id: "column-1",
      title: "Quick links",
      links: [
        { id: "link-b", label: "Contact us", href: "https://unsafe.example" },
        { id: "link-a", label: "About us", href: "https://unsafe.example" },
      ],
    }],
  })
  assert.deepEqual(localized.data.columns[0].links.map((link) => link.label), ["About us", "Contact us"])
  assert.deepEqual(localized.data.columns[0].links.map((link) => link.href), ["#about", "#contact"])
})

test("completeness and source hashes track only present visitor copy", () => {
  const section = { type: "hero", data: { title: "Bron", subtitle: "Tekst" } }
  const hash = translations.getSectionSourceHash(section)
  assert.equal(translations.getSectionTranslationStatus(section, { title: "Source" }, hash).status, "missing")
  assert.equal(translations.getSectionTranslationStatus(section, { title: "Source", subtitle: "Copy" }, hash).status, "complete")
  assert.equal(translations.getSectionTranslationStatus(
    { ...section, data: { ...section.data, title: "Nieuwe bron" } },
    { title: "Source", subtitle: "Copy" },
    hash,
  ).status, "stale")
})

test("schema, routing, and public selector include multilingual safeguards", () => {
  const migration = fs.readFileSync(path.resolve("supabase/migrations/20260719220000_multilingual_websites.sql"), "utf8")
  const frenchMigration = fs.readFileSync(path.resolve("supabase/migrations/20260720190000_add_french_website_locale.sql"), "utf8")
  const addonMigration = fs.readFileSync(path.resolve("supabase/migrations/20260720210000_add_multilingual_subscription_addon.sql"), "utf8")
  const middleware = fs.readFileSync(path.resolve("lib/supabase/middleware.ts"), "utf8")
  const navigation = fs.readFileSync(path.resolve("components/sections/nav-section.tsx"), "utf8")
  assert.match(migration, /website_locales_one_default_idx/)
  assert.match(migration, /enable row level security/g)
  assert.match(migration, /protect_default_website_locale/)
  assert.match(frenchMigration, /fr-FR/g)
  assert.match(addonMigration, /multilingual_addon_active/g)
  assert.match(addonMigration, /2\.99/g)
  assert.match(middleware, /visitorPath/)
  assert.match(middleware, /fr-FR/)
  assert.match(navigation, /localeLinks\.length > 1/)
})

test("language switcher settings reach editor, preview, and live rendering", () => {
  const editor = fs.readFileSync(path.resolve("components/editor/editor-client.tsx"), "utf8")
  const loader = fs.readFileSync(path.resolve("components/page-loader.tsx"), "utf8")
  const navigation = fs.readFileSync(path.resolve("components/sections/nav-section.tsx"), "utf8")
  const settings = fs.readFileSync(path.resolve("lib/i18n/language-switcher.ts"), "utf8")

  assert.match(editor, /languageSwitcherEditorPreview: true/)
  assert.match(editor, /themeConfig\?\.languageSwitcher/)
  assert.match(loader, /currentThemeConfig\?\.languageSwitcher \?\? themeConfig\?\.languageSwitcher/)
  assert.match(navigation, /isEditorLanguagePreview/)
  assert.match(navigation, /bottom-left/)
  assert.match(navigation, /bottom-right/)
  assert.match(settings, /dropdown/)
  assert.match(settings, /buttons/)
  assert.match(settings, /compact/)
})
