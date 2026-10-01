import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import ts from "typescript"

function load(file) {
  const module = { exports: {} }
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
  Function("module", "exports", result.outputText)(module, module.exports)
  return module.exports
}

const { EDITOR_NAVIGATION, getEditorGroup, withEditorWebsite } = load("lib/editor-navigation.ts")
const { CALENDAR_ENTRY_PRESENTATION } = load("lib/calendar-entry-presentation.ts")

test("four editor groups open their intended default page", () => {
  assert.deepEqual(EDITOR_NAVIGATION.map(({ label, href }) => [label, href]), [
    ["Website", "/editor"], ["Klantzaken", "/editor/requests"], ["Planning", "/editor/calendar"], ["Instellingen", "/editor/business"],
  ])
  for (const group of EDITOR_NAVIGATION) assert.equal(getEditorGroup(group.href)?.id, group.id)
})

test("direct and nested editor routes stay in the correct group", () => {
  for (const route of ["images", "import", "flexstart", "flexcheck", "seo"]) assert.equal(getEditorGroup(`/editor/${route}`)?.id, "website")
  assert.equal(getEditorGroup("/editor/quotes/123")?.id, "customers")
  assert.equal(getEditorGroup("/editor/reservations")?.id, "planning")
  assert.equal(getEditorGroup("/editor/domains")?.id, "settings")
  for (const route of ["/editor/account/profile", "/editor/requests-other", "/editor/unknown", null]) assert.equal(getEditorGroup(route), undefined)
})

test("website context applies only to website-scoped destinations and preserves detail parameters", () => {
  assert.equal(withEditorWebsite("/editor/flexcheck", "site & 2"), "/editor/flexcheck?websiteId=site+%26+2")
  assert.equal(withEditorWebsite("/editor/domains", "site-2"), "/editor/domains?websiteId=site-2")
  assert.equal(withEditorWebsite("/editor", "site-2"), "/editor?websiteId=site-2")
  assert.equal(withEditorWebsite("/editor/quotes?quote=123", "site-2"), "/editor/quotes?quote=123")
  assert.equal(withEditorWebsite("/editor/flexcheck?websiteId=explicit", "site-2"), "/editor/flexcheck?websiteId=explicit")
  assert.equal(withEditorWebsite("/editor/flexcheck", null), "/editor/flexcheck")
})

test("calendar type remains distinct from booking status and includes non-booking items", () => {
  assert.notEqual(CALENDAR_ENTRY_PRESENTATION.appointment.className, CALENDAR_ENTRY_PRESENTATION.booking.className)
  assert.equal(CALENDAR_ENTRY_PRESENTATION.appointment.label, "Afspraak")
  assert.equal(CALENDAR_ENTRY_PRESENTATION.booking.label, "Verblijf")
  assert.match(CALENDAR_ENTRY_PRESENTATION.blocked.className, /border-dashed/)
  assert.equal(CALENDAR_ENTRY_PRESENTATION.note.label, "Notitie")
  for (const presentation of Object.values(CALENDAR_ENTRY_PRESENTATION)) assert.ok(presentation.dotClassName)
})
