import assert from "node:assert/strict"
import test from "node:test"
import { fixture, website } from "./helpers/website-pages-fixture.mjs"
import { load } from "./helpers/load-admin-ai.mjs"

const { runFlexCheck } = load("lib/flexstart/check.ts")
const { loadWebsiteCheck } = load("lib/flexstart/server.ts", {
  "@/lib/supabase/server": {},
  "@/lib/supabase/admin": {},
  "@/lib/security": {},
  "./check": { runFlexCheck },
})
const owner = "00000000-0000-0000-0000-000000000001"

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
    const home = (await db.query("select id from website_pages where website_id=$1 and is_home", [website])).rows[0].id
    await db.query("insert into website_sections(website_id,page_id,position,type,content) values ($1,$2,0,'services','{}')", [website, home])
    await assert.rejects(db.query("select metadata from services"), /column "metadata" does not exist/)

    const result = await loadWebsiteCheck(clientFor(db), website, owner)
    assert.equal(result.check.total, 12)
    assert.equal(result.check.items.find((item) => item.id === "services").state, "ready")
    assert.ok(result.design.pages.some((page) => page.isHome))
    const previewService = result.design.sections.find((section) => section.type === "services").data.services[0]
    assert.equal(previewService.id, service)
    assert.equal(previewService.duration, "60 minuten")
    assert.equal(previewService.capacity, 4)
    await assert.rejects(loadWebsiteCheck(clientFor(db), website, "00000000-0000-0000-0000-000000000002"), /Concept niet gevonden/)
  } finally { await db.close() }
})
