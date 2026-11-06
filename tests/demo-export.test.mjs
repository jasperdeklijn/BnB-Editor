import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"
import { editorDemo, legacyDemo } from "./helpers/demo-fixture.mjs"

const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const { serializeEditorExport, parseDemoImport } = load("lib/demos/editor-export.ts")
const { prepareDemo, publicDemoDesign } = load("lib/demos/shared.ts")
const { MAX_IMPORT_BYTES } = load("lib/import/schema.ts")
const server = load("lib/supabase/server.ts")
const { GET } = load("app/api/websites/demo-export/route.ts")

test("editor export preserves content, appearance and references across newly generated IDs", () => {
  const source = editorDemo()
  const doc = parseDemoImport(serializeEditorExport(source))
  const imported = prepareDemo(doc, randomUUID)
  const home = imported.pages.find((page) => page.isHome)
  const about = imported.pages.find((page) => page.slug === "over-ons")
  const hero = imported.sections.find((section) => section.type === "hero")
  const contact = imported.sections.find((section) => section.type === "contact")
  assert.notEqual(home.id, "home")
  assert.notEqual(hero.id, "intro")
  assert.equal(hero.pageId, home.id)
  assert.equal(hero.data.ctaHref, `page:${about.id}`)
  assert.equal(hero.data.elements[0].href, `section:${about.id}:${contact.id}`)
  assert.equal(contact.data.buttonHref, `#section-${contact.id}`)
  assert.equal(imported.sections[0].data.navLinks[0].sectionId, hero.id)
  assert.equal(imported.sections[0].data.navLinks[0].href, `section:${home.id}:${hero.id}`)
  assert.deepEqual(hero.styles, source.sections[1].styles)
  assert.deepEqual(hero.data.presentation, source.sections[1].data.presentation)
  assert.deepEqual(imported.theme, source.theme)
  assert.equal(imported.transitions[0].fromSectionId, hero.id)
  assert.equal(imported.transitions[0].toSectionId, imported.sections.find((section) => section.type === "services").id)
  assert.equal(JSON.stringify(imported).includes("customer-"), false)
  assert.equal(JSON.stringify(imported).includes("booking_catalog"), false)
  const live = publicDemoDesign(imported)
  assert.equal(live.pages.length, 2)
  assert.equal(JSON.stringify(live).includes("PRIVATE CONTENT"), false)
})

test("legacy imports remain supported and native services never fall back to a viewer's business", () => {
  assert.equal(prepareDemo(parseDemoImport(JSON.stringify(legacyDemo)), randomUUID).sections.length, 1)
  const source = editorDemo()
  delete source.sections[2].data.services
  assert.deepEqual(prepareDemo(parseDemoImport(serializeEditorExport(source)), randomUUID).sections[2].data.services, [])
})

test("malformed native files, unsupported versions, unsafe data and oversized imports are rejected", () => {
  const valid = JSON.parse(serializeEditorExport(editorDemo()))
  for (const change of [
    (value) => { value.version = 2 },
    (value) => { value.unexpected = true },
    (value) => { value.sections[0].type = "script" },
    (value) => { value.sections[1].pageId = "missing" },
    (value) => { value.pages[1].slug = "api" },
    (value) => { value.pages[1].id = "home" },
    (value) => { value.sections[2].id = "intro" },
    (value) => { value.sections[1].data.ctaHref = "java\nscript:alert(1)" },
    (value) => { value.sections[1].data = JSON.parse('{"__proto__":{"polluted":true}}') },
    (value) => { value.transitions[0].toSectionId = "missing" },
  ]) {
    const value = structuredClone(valid)
    change(value)
    assert.throws(() => parseDemoImport(JSON.stringify(value)))
  }
  assert.throws(() => parseDemoImport(" ".repeat(MAX_IMPORT_BYTES + 1)))
  assert.throws(() => parseDemoImport("[".repeat(17)))
  assert.throws(() => parseDemoImport("{"))
})

function setupExport({ user = { id: "owner" }, owned = true, failTable } = {}) {
  const websiteId = "11111111-1111-4111-8111-111111111111"
  const design = editorDemo()
  const tables = {
    websites: owned ? [{ id: websiteId, user_id: "owner", title: design.title, theme_config: design.theme, business_id: "business" }] : [],
    website_pages: design.pages.map((page, position) => ({ id: page.id, website_id: websiteId, title: page.title, slug: page.slug, is_home: page.isHome, show_in_navigation: page.showInNavigation, include_in_publication: page.includeInPublication, position })),
    website_sections: design.sections.map((section) => ({ ...section, page_id: section.pageId, website_id: websiteId, content: section.type === "services" ? { ...section.data, services: undefined } : section.data })),
    section_transitions: design.transitions.map((transition) => ({ id: transition.id, website_id: websiteId, from_section_id: transition.fromSectionId, to_section_id: transition.toSectionId, transition: { type: transition.type } })),
    services: [{ ...design.sections[2].data.services[0], archived_at: null, business_id: "business" }],
  }
  const reads = []
  server.createClient = async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const filters = []
      reads.push({ table, filters })
      const query = {
        select() { return this }, eq(key, value) { filters.push([key, value]); return this },
        is(key, value) { filters.push([key, value]); return this }, order() { return this },
        async maybeSingle() { return { data: (tables[table] ?? []).find((row) => filters.every(([key, value]) => row[key] === value)) ?? null, error: null } },
        async range(offset) {
          if (table === failTable) return { data: null, error: { message: "Database unavailable" } }
          const matching = (tables[table] ?? []).filter((row) => filters.every(([key, value]) => row[key] === value))
          // Simulate a hosted max_rows cap to exercise pagination across every page.
          return { data: matching.slice(offset, offset + 2), count: matching.length, error: null }
        },
      }
      return query
    },
  })
  return { websiteId, reads }
}

test("export API authenticates and scopes ownership before reading any design data", async () => {
  let state = setupExport({ user: null })
  assert.equal((await GET(new Request(`https://example.com/api/websites/demo-export?websiteId=${state.websiteId}`))).status, 401)
  assert.equal(state.reads.length, 0)
  state = setupExport()
  assert.equal((await GET(new Request("https://example.com/api/websites/demo-export?websiteId=bad"))).status, 400)
  assert.equal(state.reads.length, 0)
  state = setupExport({ owned: false })
  assert.equal((await GET(new Request(`https://example.com/api/websites/demo-export?websiteId=${state.websiteId}`))).status, 404)
  assert.deepEqual(state.reads.map((entry) => entry.table), ["websites"])
  assert.ok(state.reads[0].filters.some(([key, value]) => key === "user_id" && value === "owner"))
})

test("download includes all pages, frozen services, transitions and no source identifiers", async () => {
  const state = setupExport()
  const response = await GET(new Request(`https://example.com/api/websites/demo-export?websiteId=${state.websiteId}`))
  const raw = await response.text()
  assert.equal(response.status, 200, raw)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.match(response.headers.get("content-disposition"), /attachment;.*\.json/)
  const doc = parseDemoImport(raw)
  assert.equal(doc.pages.length, 3)
  assert.equal(doc.sections.length, 6)
  assert.equal(doc.transitions[0].type, "wave")
  assert.equal(doc.sections.find((section) => section.type === "services").data.services[0].title, "Kamer")
  assert.equal(raw.includes("customer-"), false)
  assert.equal(raw.includes(state.websiteId), false)
  const live = publicDemoDesign(prepareDemo(doc, randomUUID))
  assert.equal(live.pages.length, 2)
  assert.equal(JSON.stringify(live).includes("PRIVATE CONTENT"), false)
})

test("a partial database read fails the export instead of downloading a truncated demo", async () => {
  const state = setupExport({ failTable: "website_sections" })
  const response = await GET(new Request(`https://example.com/api/websites/demo-export?websiteId=${state.websiteId}`))
  assert.equal(response.status, 503)
})
