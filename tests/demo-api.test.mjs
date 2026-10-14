import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"

const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const server = load("lib/supabase/server.ts")
const admin = load("lib/supabase/admin.ts")
const limiter = load("lib/rate-limit.ts")
const audit = load("lib/audit-log.ts")
const { POST } = load("app/api/admin/demos/route.ts")
const { GET, PATCH, DELETE } = load("app/api/admin/demos/[id]/route.ts")
const { publicDemo } = load("lib/demos/server.ts")
const raw = fs.readFileSync("docs/import/examples/bnb.json", "utf8")
const actor = randomUUID()
const id = randomUUID()
const metadata = { id, title: "Café De Lindenhof", slug: "demo-lindenhof", source_filename: "lindenhof.json", published: true }
const context = { params: Promise.resolve({ id }) }
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key"

function setup(user = { id: actor, app_metadata: { role: "admin" } }) {
  const rows = new Map()
  let writes = 0, privileged = 0
  const events = []
  server.createClient = async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } })
  limiter.checkRateLimit = async () => ({ allowed: true })
  audit.logAuditEvent = async (event) => events.push(event)
  admin.createAdminClient = async () => {
    privileged++
    return { from(table) {
      assert.equal(table, "demo_websites")
      let mode = "select", value, selectedId, columns = "*"
      return {
        insert(row) { mode = "insert"; value = row; return this },
        update(row) { mode = "update"; value = row; return this },
        delete() { mode = "delete"; return this },
        select(list) { columns = list; return this },
        eq(key, match) { assert.equal(key, "id"); selectedId = match; return this },
        async single() { return this.maybeSingle() },
        async maybeSingle() {
          let row = rows.get(selectedId)
          if (mode === "insert") {
            if (rows.has(value.id) || [...rows.values()].some((entry) => entry.slug === value.slug)) return { data: null, error: { code: "23505" } }
            row = { ...value, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            rows.set(row.id, row); writes++
          }
          if (mode === "update" && row) { row = { ...row, ...value }; rows.set(selectedId, row); writes++ }
          if (mode === "delete" && row) { rows.delete(selectedId); writes++ }
          return { data: row ? Object.fromEntries(columns.split(",").map((key) => [key, row[key]])) : null, error: null }
        },
      }
    } }
  }
  return { rows, writes: () => writes, privileged: () => privileged, events }
}

function upload(body = raw, meta = metadata, headers = {}) {
  return new Request("https://flexpagina.nl/api/admin/demos", { method: "POST", body,
    headers: { "Content-Type": "application/json", Origin: "https://flexpagina.nl", "X-Demo-Metadata": encodeURIComponent(JSON.stringify(meta)), ...headers } })
}
function patch(body, headers = {}) {
  return new Request(`https://flexpagina.nl/api/admin/demos/${id}`, { method: "PATCH", body, headers: { Origin: "https://flexpagina.nl", ...headers } })
}

test("all demo endpoints reject signed-out users and non-admins before privileged access", async () => {
  for (const [user, status] of [[null, 401], [{ id: actor, app_metadata: {}, user_metadata: { role: "admin" } }, 403]]) {
    const state = setup(user)
    assert.equal((await POST(upload())).status, status)
    assert.equal((await GET(new Request("https://flexpagina.nl"), context)).status, status)
    assert.equal((await PATCH(patch('{"published":true}'), context)).status, status)
    assert.equal((await DELETE(new Request("https://flexpagina.nl", { method: "DELETE" }), context)).status, status)
    assert.equal(state.privileged(), 0)
    assert.equal(state.writes(), 0)
  }
})

test("admin upload validates origin, bounded body, import document, metadata and rate limit", async () => {
  const state = setup()
  for (const [request, status] of [
    [upload(raw, metadata, { Origin: "https://attacker.example" }), 403],
    [upload(raw, metadata, { "Content-Type": "text/html" }), 415],
    [upload("{"), 400],
    [upload(" ".repeat(2 * 1024 * 1024 + 1)), 413],
    [upload(raw, { ...metadata, slug: "customer" }), 400],
    [upload(raw, { ...metadata, created_by: "another-user" }), 400],
    [upload(raw, { ...metadata, id: "bad" }), 400],
    [upload(JSON.stringify({ ...JSON.parse(raw), injected: true })), 400],
  ]) assert.equal((await POST(request)).status, status)
  limiter.checkRateLimit = async () => ({ allowed: false })
  assert.equal((await POST(upload())).status, 429)
  assert.equal(state.writes(), 0)
})

test("create, retry, collision, private preview, publish, unpublish and delete use the same demo", async () => {
  const state = setup()
  let response = await POST(upload())
  assert.equal(response.status, 201)
  let result = await response.json()
  assert.equal(result.demo.slug, "demo-lindenhof")
  assert.equal(result.demo.title, "Café De Lindenhof")
  assert.equal(result.demo.published, true)
  assert.equal("design" in result.demo, false)
  assert.equal("request_hash" in result.demo, false)
  const design = state.rows.get(id).design
  assert.equal(state.rows.get(id).created_by, actor)
  assert.equal(design.sections.length, JSON.parse(raw).sections.length)
  assert.equal((await POST(upload())).status, 201)
  assert.equal(state.writes(), 1)
  assert.equal((await POST(upload(raw, { ...metadata, id: randomUUID() }))).status, 409)
  assert.equal((await POST(upload(raw, { ...metadata, title: "Changed" }))).status, 409)
  response = await GET(new Request("https://flexpagina.nl"), context)
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).design, design)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.equal((await PATCH(patch('{"published":false,"created_by":"evil"}'), context)).status, 400)
  assert.equal((await PATCH(patch("{"), context)).status, 400)
  assert.equal((await PATCH(patch('{"published":false}', { Origin: "https://attacker.example" }), context)).status, 403)
  result = await (await PATCH(patch('{"published":false}'), context)).json()
  assert.equal(result.demo.published, false)
  result = await (await PATCH(patch('{"published":true}'), context)).json()
  assert.equal(result.demo.published, true)
  assert.equal((await DELETE(new Request("https://flexpagina.nl", { method: "DELETE", headers: { Origin: "https://attacker.example" } }), context)).status, 403)
  assert.equal((await DELETE(new Request("https://flexpagina.nl", { method: "DELETE" }), context)).status, 200)
  assert.equal(state.rows.size, 0)
  assert.equal((await GET(new Request("https://flexpagina.nl"), context)).status, 404)
  assert.ok(state.events.some((event) => event.action === "demo.deleted"))
})

test("public loading uses only the live projection, requires publication and skips ordinary slugs", async () => {
  let reads = 0
  const rows = [{ title: "Live", slug: "demo-live", published: true, live_design: { title: "Published only" }, design: { private: true } },
    { title: "Draft", slug: "demo-draft", published: false, live_design: { private: true } }]
  server.createClient = async () => ({ from(table) {
    reads++
    assert.equal(table, "demo_websites")
    let slug, published
    return {
      select(columns) { assert.equal(columns, "title,slug,live_design"); return this },
      eq(key, value) { if (key === "slug") slug = value; else if (key === "published") published = value; return this },
      async maybeSingle() { return { data: rows.find((row) => row.slug === slug && row.published === published), error: null } },
    }
  } })
  assert.equal(await publicDemo("customer"), null)
  assert.equal(reads, 0)
  assert.deepEqual(await publicDemo("demo-live"), { title: "Live", slug: "demo-live", design: { title: "Published only" } })
  assert.equal(await publicDemo("demo-draft"), null)
  assert.equal(await publicDemo("demo-missing"), null)
})
