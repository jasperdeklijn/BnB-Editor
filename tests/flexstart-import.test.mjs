import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { createRequire } from "node:module"
import { fixture } from "./helpers/website-pages-fixture.mjs"

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
const load = createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const { parseImport, normalizeImport } = load("lib/import/schema.ts")
const repair = read("supabase/migrations/20261006200637_flexstart_import_business_profile.sql")
const owner = "00000000-0000-0000-0000-000000000001"

test("Duynhoven FlexStart import creates a missing customer profile atomically and reuses it", async () => {
  const db = await fixture()
  const requestId = randomUUID()
  const document = parseImport(read("imports/duynhoven/duynhoven-multipage.json"))
  try {
    await db.exec("reset role; grant usage on schema auth to service_role;")
    // Reproduce the deployed function before applying the additive repair.
    const previous = read("supabase/migrations/20261006162718_multipage_operations_and_publication.sql")
      .match(/create or replace function public\.create_transfer_design\([\s\S]*?end; \$\$;/)[0]
    await db.exec(previous)
    await db.query(`insert into website_transfer_requests(id,user_id,source_url,business_name,business_type,services,city,service_area,primary_goal,status)
      values($1,$2,'https://example.com','Duynhoven','coach','Coaching','Utrecht','Utrecht','requests','processing')`, [requestId, owner])
    const revision = async () => (await db.query("select revision from website_transfer_requests where id=$1", [requestId])).rows[0].revision
    const create = (id, rev, pages) => {
      const native = normalizeImport(document, randomUUID)
      return db.query("select create_multipage_transfer_design($1,$2,$3,$4,'[]',$5,$6,$7)",
        [id, native.title, native.theme, native.sections, pages ?? native.pages, requestId, rev])
    }
    await db.exec("set role service_role")
    const initialRevision = await revision()
    await assert.rejects(create(randomUUID(), initialRevision), /Customer business required/)
    await db.exec("reset role")
    await db.exec(repair)
    await db.exec("set role service_role")

    const failed = randomUUID()
    await assert.rejects(create(failed, initialRevision, []), /pagina-import/)
    assert.equal((await db.query("select id from businesses where user_id=$1", [owner])).rows.length, 0)
    assert.equal((await db.query("select id from websites where id=$1", [failed])).rows.length, 0)
    assert.equal(await revision(), initialRevision)
    await assert.rejects(create(randomUUID(), initialRevision - 1), /Invalid transfer/)
    assert.equal((await db.query("select id from businesses where user_id=$1", [owner])).rows.length, 0)

    const designId = randomUUID()
    await create(designId, initialRevision)
    const profile = (await db.query("select id,user_id,name,city,website_url from businesses where user_id=$1", [owner])).rows[0]
    assert.deepEqual(profile, { id: profile.id, user_id: owner, name: "Duynhoven", city: "Utrecht", website_url: "https://example.com" })
    const website = (await db.query("select user_id,business_id,published,live_snapshot from websites where id=$1", [designId])).rows[0]
    assert.deepEqual(website, { user_id: owner, business_id: profile.id, published: false, live_snapshot: null })
    assert.equal((await db.query("select count(*)::int n from website_pages where website_id=$1", [designId])).rows[0].n, 5)
    assert.equal((await db.query("select count(*)::int n from website_sections where website_id=$1", [designId])).rows[0].n, 21)
    assert.equal((await db.query("select website_id,status from website_transfer_requests where id=$1", [requestId])).rows[0].status, "checking")
    assert.ok(await revision() > initialRevision)

    await db.query("update businesses set name='Bestaande klantgegevens',email='owner@example.test' where id=$1", [profile.id])
    const existing = (await db.query("select * from businesses where id=$1", [profile.id])).rows[0]
    await create(randomUUID(), await revision())
    assert.equal((await db.query("select count(*)::int n from businesses where user_id=$1", [owner])).rows[0].n, 1)
    assert.deepEqual((await db.query("select * from businesses where id=$1", [profile.id])).rows[0], existing)
    await db.exec("reset role; set role authenticated")
    await assert.rejects(create(randomUUID(), await revision()), /permission denied/)
    await db.exec("reset role; set role anon")
    await assert.rejects(create(randomUUID(), 1), /permission denied/)
    const bootstrap = read("supabase/init.sql").split("-- BEGIN FLEXSTART IMPORT BUSINESS PROFILE\n")[1].split("-- END FLEXSTART IMPORT BUSINESS PROFILE")[0].trim()
    assert.equal(bootstrap, repair.trim())
  } finally { await db.close() }
})

test("FlexStart import returns actionable import failures without exposing unexpected errors", async () => {
  const context = load("lib/flexstart/server.ts")
  const service = load("lib/import/create-design.ts")
  const limiter = load("lib/rate-limit.ts")
  const { POST } = load("app/api/flexstart/[id]/import/route.ts")
  const requestId = randomUUID(), designId = randomUUID()
  context.flexContext = async () => ({ user: { id: "admin" }, db: {}, client: { rpc: async () => ({ data: 3 }) } })
  context.ownedTransfer = async () => ({ user_id: owner, revision: 1, status: "processing", permission_confirmed_at: "confirmed" })
  limiter.checkRateLimit = async () => ({ allowed: true })
  const request = () => new Request(`https://app.example/api/flexstart/${requestId}/import`, {
    method: "POST", body: read("imports/duynhoven/duynhoven-multipage.json"),
    headers: { Origin: "https://app.example", "x-import-design-id": designId, "x-import-permission": "confirmed", "x-transfer-revision": "1" },
  })
  for (const [message, status] of [["Bedrijfsprofiel ontbreekt", 409], ["Afbeelding 1 kon niet worden geïmporteerd", 422]]) {
    service.createImportedDesign = async () => { throw new service.ImportCreationError(message, status) }
    const response = await POST(request(), { params: Promise.resolve({ id: requestId }) })
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: message })
  }
  service.createImportedDesign = async () => { throw new Error("secret database payload") }
  const response = await POST(request(), { params: Promise.resolve({ id: requestId }) })
  assert.equal(response.status, 500)
  assert.ok(!JSON.stringify(await response.json()).includes("secret"))
})
