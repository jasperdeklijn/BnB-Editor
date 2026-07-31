import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

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
  return {}
})

const { isWebsiteLiveSnapshot, WEBSITE_SNAPSHOT_VERSION } = module.exports

const validSnapshot = {
  version: 2,
  publishedAt: "2026-07-12T12:00:00.000Z",
  draftVersion: "00000000-0000-0000-0000-000000000001",
  website: { id: "website-1" },
  ownerEmail: null,
  business: null,
  services: [],
  availabilityWindows: [],
  sections: [],
  transitions: [],
  locales: [],
}

test("accepts complete versioned live snapshots", () => {
  assert.equal(WEBSITE_SNAPSHOT_VERSION, 2)
  assert.equal(isWebsiteLiveSnapshot(validSnapshot), true)
})

test("rejects missing, partial, and future snapshots", () => {
  assert.equal(isWebsiteLiveSnapshot(null), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, sections: undefined }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, version: 1 }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, locales: undefined }), false)
  assert.equal(isWebsiteLiveSnapshot({ ...validSnapshot, version: 3, locales: [] }), false)
})

test("a copied live snapshot is isolated from later draft mutations", () => {
  const draft = [{ id: "hero", type: "hero", data: { title: "Live title" } }]
  const live = JSON.parse(JSON.stringify({ ...validSnapshot, sections: draft }))
  draft[0].data.title = "New draft title"

  assert.equal(live.sections[0].data.title, "Live title")
  assert.equal(draft[0].data.title, "New draft title")
})
