import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import { createRequire } from "node:module"
const load = createRequire(import.meta.url)("../scripts/load-import-module.cjs")

const sourcePath = path.resolve("lib/website-snapshot.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
})
const module = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(module, module.exports, (specifier) => {
  if (specifier.includes("i18n/locales")) return { DEFAULT_WEBSITE_LOCALE: "nl-NL" }
  if (specifier.includes("i18n/section-translations")) return {
    applySectionTranslation: (section) => section,
    getSectionTranslationStatus: () => ({ status: "complete" }),
  }
  if (specifier.includes("website-links")) return load("lib/website-links.ts")
  if (specifier.includes("website-pages")) return { RESERVED_PAGE_SLUGS: new Set(["en","de","fr","nl"]) }
  return {}
})

const { isWebsiteLiveSnapshot, WEBSITE_SNAPSHOT_VERSION } = module.exports

const validSnapshot = {
  version: 3,
  publishedAt: "2026-07-12T12:00:00.000Z",
  draftVersion: "00000000-0000-0000-0000-000000000001",
  website: { id: "website-1" },
  business: null,
  services: [],
  availabilityWindows: [],
  sections: [],
  transitions: [],
  locales: [{ locale: "nl-NL", pathSegment: "nl", isDefault: true, sections: [] }],
  pages: [{ id: "home", websiteId: "website-1", title: "Home", slug: "", isHome: true, includeInPublication: true, sections: [], transitions: [], locales: [{ locale: "nl-NL", title: "Home", seo: {}, sections: [] }] }],
  sharedSections: [],
  redirects: [],
}

test("accepts complete versioned live snapshots", () => {
  assert.equal(WEBSITE_SNAPSHOT_VERSION, 3)
  assert.equal(isWebsiteLiveSnapshot(validSnapshot), true)
})

test("rejects missing, partial, and future snapshots", () => {
  assert.equal(isWebsiteLiveSnapshot(null), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, sections: undefined }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, version: 1 }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, locales: undefined }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, version: 4, locales: [] }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, version: 2 }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, pages: [] }), false)
})

test("a copied live snapshot is isolated from later draft mutations", () => {
  const draft = [{ id: "hero", type: "hero", data: { title: "Live title" } }]
  const live = JSON.parse(JSON.stringify({ ...validSnapshot, sections: draft }))
  draft[0].data.title = "New draft title"

  assert.equal(live.sections[0].data.title, "Live title")
  assert.equal(draft[0].data.title, "New draft title")
})

test("snapshot validation rejects foreign links, duplicate locale identities and redirect collisions", () => {
  const snapshot=structuredClone(validSnapshot)
  const section={id:"intro",type:"hero",data:{ctaEnabled:true,ctaHref:"page:home"}}
  snapshot.sections=[section]; snapshot.locales[0].sections=[section]
  snapshot.pages[0].sections=[section]; snapshot.pages[0].locales[0].sections=[section]
  assert.equal(isWebsiteLiveSnapshot(snapshot),true)
  snapshot.pages[0].locales[0].sections[0].data.ctaHref="page:foreign"
  assert.equal(isWebsiteLiveSnapshot(snapshot),false)
  snapshot.pages[0].locales[0].sections[0].data.ctaHref="page:home"
  snapshot.redirects=[{fromSlug:"en",toPageId:"home"}]
  assert.equal(isWebsiteLiveSnapshot(snapshot),false)
  snapshot.redirects=[{fromSlug:"previous-home",toPageId:"home"}]
  assert.equal(isWebsiteLiveSnapshot(snapshot),true)
  snapshot.pages[0].locales.push(snapshot.pages[0].locales[0])
  assert.equal(isWebsiteLiveSnapshot(snapshot),false)
})
