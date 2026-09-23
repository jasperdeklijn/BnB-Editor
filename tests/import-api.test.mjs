import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const server = load("lib/supabase/server.ts")
const admin = load("lib/supabase/admin.ts")
const limiter = load("lib/rate-limit.ts")
const service = load("lib/import/create-design.ts")
const { POST } = load("app/api/websites/import/route.ts")
const raw = fs.readFileSync("docs/import/examples/bnb.json", "utf8")
const id = "cdb481a5-2c7e-4edf-b559-212341b5ef1c"
function setup({ user = { id: "owner" }, allowed = true, existing = null } = {}) {
  let writes = 0, storageClients = 0
  const filters = []
  const query = { select() { return this }, eq(key, value) { filters.push([key, value]); return this },
    async maybeSingle() { return { data: existing, error: null } } }
  server.createClient = async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => query })
  admin.createAdminClient = async () => { storageClients++; return {} }
  limiter.checkRateLimit = async () => ({ allowed })
  service.createImportedDesign = async (options) => { writes++; assert.equal(options.userId, "owner"); return options.designId }
  return { filters, writes: () => writes, storageClients: () => storageClients }
}
function request(body = raw, overrides = {}) {
  return new Request("https://app.example/api/websites/import", { method: "POST", body,
    headers: { "Content-Type": "application/json", Origin: "https://app.example", "X-Import-Permission": "confirmed", "X-Import-Design-Id": id, ...overrides } })
}
test("API authenticates and gates consent/origin/rate limits before writes", async () => {
  let f = setup({ user: null })
  assert.equal((await POST(request())).status, 401)
  assert.equal(f.writes(), 0)
  f = setup()
  assert.equal((await POST(request(raw, { "X-Import-Permission": "" }))).status, 400)
  assert.equal((await POST(request(raw, { Origin: "https://attacker.example" }))).status, 403)
  assert.equal(f.writes(), 0)
  f = setup({ allowed: false })
  assert.equal((await POST(request())).status, 429)
  assert.equal(f.storageClients(), 0)
})
test("API rejects malformed/oversized/unknown fields without creating assets or designs", async () => {
  const f = setup()
  for (const body of ["{", " ".repeat(2 * 1024 * 1024 + 1), JSON.stringify({ ...JSON.parse(raw), user_id: "another-user" })]) {
    assert.equal((await POST(request(body))).status, 400)
  }
  assert.equal(f.writes(), 0)
  assert.equal(f.storageClients(), 0)
})
test("valid requests get owner identity from auth; retry reopens the same owned design", async () => {
  let f = setup()
  const response = await POST(request())
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { websiteId: id })
  assert.equal(f.writes(), 1)
  assert.ok(f.filters.some(([key, value]) => key === "user_id" && value === "owner"))
  f = setup({ existing: { id } })
  assert.equal((await POST(request())).status, 200)
  assert.equal(f.writes(), 0)
  assert.equal(f.storageClients(), 0)
})

