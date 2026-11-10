import assert from "node:assert/strict"
import test from "node:test"
import { fixture, website } from "./helpers/website-pages-fixture.mjs"
import { load } from "./helpers/load-admin-ai.mjs"

const { runFlexCheck } = load("lib/flexstart/check.ts", { "../website-links": load("lib/website-links.ts") })
const { loadWebsiteCheck } = load("lib/flexstart/server.ts", {
  "@/lib/supabase/server": {},
  "@/lib/supabase/admin": {},
  "@/lib/security": {},
  "./check": { runFlexCheck },
})
const owner = "00000000-0000-0000-0000-000000000001"

test("FlexCheck recognizes working page and section buttons without approving broken or excluded targets", () => {
  const input = {
    website: { id: "site", title: "Test", draft_version: "v1" }, business: null, services: [], hasDestination: false, domainActive: false,
    pages: [{ id: "home", includeInPublication: true }, { id: "contact", includeInPublication: true }, { id: "draft", includeInPublication: false }],
    sections: [
      { id: "intro", type: "hero", pageId: "home", data: { ctaText: "Contact", ctaHref: "section:contact:contact-block" } },
      { id: "contact-block", type: "contact", pageId: "contact", data: {} },
      { id: "draft-block", type: "contact", pageId: "draft", data: {} },
    ],
  }
  const state = (href, enabled) => runFlexCheck({ ...input, sections: input.sections.map((section) => section.id === "intro"
    ? { ...section, data: { ...section.data, ctaHref: href, ctaEnabled: enabled } } : section) }).items.find((item) => item.id === "cta").state
  for (const href of ["section:contact:contact-block", "page:contact", "mailto:owner@example.test", "tel:+31600000000"]) assert.equal(state(href), "ready", href)
  for (const href of ["section:home:contact-block", "section:contact:missing", "section:draft:draft-block", "page:draft", "page:missing", "javascript:alert(1)", "#section-contact-block"]) assert.equal(state(href), "required", href)
  assert.equal(state("section:contact:contact-block", false), "required")
})

test("FlexCheck accepts a privacy page selected in the editor but rejects unavailable or non-web destinations", () => {
  const input = {
    website: { id: "site", title: "Test", draft_version: "v1" }, business: null, services: [], hasDestination: false, domainActive: false,
    pages: [{ id: "privacy", includeInPublication: true }, { id: "draft", includeInPublication: false }],
  }
  const state = (href) => runFlexCheck({ ...input, sections: [{ id: "footer", type: "footer", data: { columns: [{ links: [{ label: "Privacyverklaring", href }] }] } }] }).items.find((item) => item.id === "privacy").state
  assert.equal(state("page:privacy"), "ready")
  for (const href of ["page:draft", "page:missing", "javascript:alert(1)", "mailto:privacy@example.test"]) assert.equal(state(href), "required", href)
})

test("FlexCheck resolves legacy section aliases on the current page like the preview", () => {
  const input = {
    website: { id: "site", title: "Test", draft_version: "v1" }, business: null, services: [], hasDestination: false, domainActive: false,
    pages: [{ id: "home", includeInPublication: true }, { id: "other", includeInPublication: true }],
  }
  const intro = { id: "intro", type: "hero", pageId: "home", data: { ctaText: "Contact", ctaHref: "#contact" } }
  const contact = { id: "contact", type: "contact", pageId: "home", data: {} }
  const state = (sections) => runFlexCheck({ ...input, sections }).items.find((item) => item.id === "cta").state
  assert.equal(state([intro, contact]), "ready")
  assert.equal(state([intro]), "required")
  assert.equal(state([intro, { ...contact, pageId: "other" }]), "required")
  assert.equal(state([{ ...intro, data: { ...intro.data, ctaHref: "#hero" } }, contact]), "required")
})

// Execute the loader's selected columns and owner filters against PostgreSQL,
// rather than accepting arbitrary column names in a mocked response.
function clientFor(db) {
  function identifier(name) {
    assert.match(name, /^[a-z_]+$/)
    return `"${name}"`
  }
  return { from(table) {
    let projection = "*", single = false, order = ""
    const filters = [], values = []
    const query = {
      select(columns) { projection = columns === "*" ? "*" : columns.split(",").map(identifier).join(","); return query },
      eq(column, value) { values.push(value); filters.push(`${identifier(column)}=$${values.length}`); return query },
      is(column, value) { assert.equal(value, null); filters.push(`${identifier(column)} is null`); return query },
      order(column) { order = ` order by ${identifier(column)}`; return query },
      maybeSingle() { single = true; return query },
      async then(resolve, reject) {
        try {
          const where = filters.length ? ` where ${filters.join(" and ")}` : ""
          const { rows } = await db.query(`select ${projection} from public.${identifier(table)}${where}${order}`, values)
          return resolve({ data: single ? rows[0] ?? null : rows, error: null })
        } catch (error) {
          try { return resolve({ data: null, error }) } catch (cause) { return reject(cause) }
        }
      },
    }
    return query
  } }
}

test("FlexCheck loads real init tables without a nonexistent services.metadata column", async () => {
  const db = await fixture()
  try {
    await db.exec("reset role")
    const business = (await db.query("insert into businesses(user_id,name,city,email) values ($1,'Bedrijf','Utrecht','owner@example.test') returning id", [owner])).rows[0].id
    await db.query("update websites set business_id=$2 where id=$1", [website, business])
    const service = (await db.query("insert into services(business_id,title,duration,capacity) values ($1,'Coaching','60 minuten',4) returning id", [business])).rows[0].id
    await db.query("insert into services(business_id,title,image_urls,archived_at) values ($1,'Gearchiveerde dienst',$2::jsonb,now())", [business, JSON.stringify(["https://example.test/archive.jpg"])])
    const home = (await db.query("select id from website_pages where website_id=$1 and is_home", [website])).rows[0].id
    await db.query("insert into website_sections(website_id,page_id,position,type,content) values ($1,$2,0,'services','{}')", [website, home])
    const contact = (await db.query("insert into website_sections(website_id,page_id,position,type,content) values ($1,$2,1,'contact','{}') returning id", [website, home])).rows[0].id
    await db.query("insert into website_sections(website_id,page_id,position,type,content) values ($1,$2,2,'hero',$3)", [website, home, JSON.stringify({ ctaText: "Contact", ctaHref: `section:${home}:${contact}` })])
    await assert.rejects(db.query("select metadata from services"), /column "metadata" does not exist/)

    const result = await loadWebsiteCheck(clientFor(db), website, owner)
    assert.equal(result.check.total, 12)
    assert.equal(result.check.items.find((item) => item.id === "services").state, "ready")
    assert.equal(result.check.items.find((item) => item.id === "cta").state, "ready")
    assert.ok(result.design.pages.some((page) => page.isHome))
    const previewService = result.design.sections.find((section) => section.type === "services").data.services[0]
    assert.equal(previewService.id, service)
    assert.equal(previewService.duration, "60 minuten")
    assert.equal(previewService.capacity, 4)
    assert.equal(result.design.sections.find((section) => section.type === "services").data.services.length, 1)
    assert.notEqual(result.check.items.find((item) => item.id === "images").state, "ready", "archived service photos do not count as website images")
    await db.query("update services set archived_at=now() where id=$1", [service])
    const archivedResult = await loadWebsiteCheck(clientFor(db), website, owner)
    assert.equal(archivedResult.check.items.find((item) => item.id === "services").state, "required")
    assert.deepEqual(archivedResult.design.sections.find((section) => section.type === "services").data.services, [])
    await assert.rejects(loadWebsiteCheck(clientFor(db), website, "00000000-0000-0000-0000-000000000002"), /Concept niet gevonden/)
  } finally { await db.close() }
})
