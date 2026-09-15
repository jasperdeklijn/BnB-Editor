import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"
const require = createRequire(import.meta.url)
const websiteId = "20000000-0000-0000-0000-000000000001"
function compile(file, imports = {}, env = {}) {
  const m = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  Function("module", "exports", "require", "process", js)(m, m.exports, (name) => name in imports ? imports[name] : require(name), { env })
  return m.exports
}
const shared = compile("lib/reviews/shared.ts")
const presentation = compile("lib/reviews/presentation.ts")
function fixture() {
  const state = { rows: [], messages: [], collection: true, mailFails: false, authenticated: false, rate: { allowed: true }, dbFails: false }
  const website = { id: websiteId, business_id: "business", user_id: "owner", title: "PRIVATE DRAFT TITLE", live_snapshot: { website: { title: "Published title" } } }
  function query(table) {
    const filters = []; let operation = "select", payload
    const q = {
      select() { return q }, eq(key,value) { filters.push((row) => row[key] === value); return q }, neq(key,value) { filters.push((row) => row[key] !== value); return q },
      insert(value) { operation = "insert"; payload = value; return q }, update(value) { operation = "update"; payload = value; return q },
      async run() {
        if (state.dbFails) return { data: null, error: { message: "PRIVATE DATABASE ERROR" } }
        if (table === "websites") return { data: filters.every((f) => f(website)) ? website : null, error: null }
        if (table !== "customer_reviews") return { data: null, error: null }
        if (operation === "insert") {
          if (state.rows.some((row) => row.email === payload.email && row.website_id === payload.website_id)) return { data: null, error: { code: "23505" } }
          const row = { id: String(state.rows.length + 1), status: "unconfirmed", created_at: new Date().toISOString(), ...payload }; state.rows.push(row); return { data: row, error: null }
        }
        const row = state.rows.find((row) => filters.every((f) => f(row))) || null
        if (row && operation === "update") Object.assign(row, payload)
        return { data: row, error: null }
      },
      single() { return q.run() }, maybeSingle() { return q.run() }, then(resolve,reject) { return q.run().then(resolve,reject) },
    }
    return q
  }
  const client = { from: query, auth: { getUser: async () => ({ data: { user: state.authenticated ? { id: "owner" } : null } }) }, rpc: async (name) => ({ data: name === "review_collection_live" ? state.collection : null, error: null }) }
  const server = compile("lib/reviews/server.ts", {
    "server-only": {}, "./shared": shared, "./presentation": presentation,
    "@/lib/supabase/admin": { createAdminClient: async () => client },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/subscriptions": { getUserSubscription: async () => ({ planId: "gold", source: "subscription", record: { plan_id: "gold", status: "active", current_period_end: null } }) },
    "@/lib/platform": { PLATFORM_BASE_URL: "https://platform.example.test", PLATFORM_EMAILS: { info: "info@example.test" } },
    "@/lib/rate-limit": { checkRateLimit: async () => state.rate, getRateLimitKey: () => "fixture" },
    nodemailer: { createTransport: () => ({ sendMail: async (mail) => { if (state.mailFails) throw new Error("PRIVATE SMTP ERROR"); state.messages.push(mail) } }) },
  }, { NODE_ENV: "production", SMTP_HOST: "fixture", SMTP_USER: "fixture", SMTP_PASS: "fixture" })
  const api = compile("app/api/reviews/route.ts", { "@/lib/reviews/server": server, "next/server": { NextResponse: { json: (data, init) => Response.json(data, init) } } })
  return { state, server, api }
}
const input = { action: "submit", websiteId, name: "Customer", email: "customer@example.test", rating: 2, body: "This is my original honest feedback.", consent: true }
const request = (body, origin = "https://platform.example.test") => new Request("https://platform.example.test/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) })
test("submission saves the original review before sending mail and never returns secrets", async () => {
  const { state, api, server } = fixture()
  const response = await api.POST(request(input))
  assert.equal(response.status,200); assert.deepEqual(await response.json(),{ success:true })
  assert.equal(state.rows.length,1); assert.equal(state.messages.length,1)
  assert.equal(state.rows[0].rating,2); assert.equal(state.rows[0].body,input.body); assert.equal(state.rows[0].delivery_status,"sent")
  const mail = state.messages[0].text
  assert.match(mail,/Published title/); assert.doesNotMatch(mail,/PRIVATE DRAFT TITLE/)
  const confirmation = mail.match(/confirm#token=([a-f0-9]{64})/)[1], withdrawal = mail.match(/withdraw#token=([a-f0-9]{64})/)[1]
  assert.notEqual(confirmation,withdrawal)
  assert.equal(state.rows[0].confirmation_hash,server.hashReviewToken(confirmation))
  assert.equal(state.rows[0].withdrawal_hash,server.hashReviewToken(withdrawal))
  assert.equal(JSON.stringify(state.rows).includes(confirmation),false)
  assert.equal(response.headers.get("Cache-Control"),"no-store, private")
})
test("SMTP failure retains a retryable submission and resend rotates tokens without replacing text", async () => {
  const { state, api } = fixture(); state.mailFails = true
  const response = await api.POST(request(input))
  assert.equal(response.status,503); assert.equal(state.rows[0].delivery_status,"failed")
  assert.doesNotMatch(await response.text(),/PRIVATE SMTP/)
  const hash = state.rows[0].confirmation_hash; state.mailFails = false
  assert.equal((await api.POST(request({action:"resend",websiteId,email:input.email}))).status,200)
  assert.notEqual(state.rows[0].confirmation_hash,hash); assert.equal(state.rows[0].body,input.body)
  assert.equal(state.rows[0].delivery_status,"sent")
})
test("duplicate submission cannot replace a review or resend email automatically", async () => {
  const { state, api } = fixture()
  await api.POST(request(input)); await api.POST(request({...input,body:"A different replacement review",rating:5}))
  assert.equal(state.rows.length,1); assert.equal(state.rows[0].body,input.body); assert.equal(state.messages.length,1)
})
test("paused collection blocks submission/resend but still permits withdrawal email requests", async () => {
  const { state, api } = fixture()
  await api.POST(request(input)); state.collection = false
  assert.equal((await api.POST(request({...input,email:"second@example.test"}))).status,404)
  assert.equal((await api.POST(request({action:"resend",websiteId,email:input.email}))).status,404)
  assert.equal((await api.POST(request({action:"withdrawal-email",websiteId,email:input.email}))).status,200)
  assert.equal(state.messages.length,2); assert.doesNotMatch(state.messages[1].text,/confirm#token=/)
})
test("HTTP boundary rejects cross-origin requests, oversized input and malformed JSON before mutations", async () => {
  const { state, api } = fixture()
  assert.equal((await api.POST(request(input,"https://other.example.test"))).status,403)
  assert.equal((await api.POST(request({...input,body:"x".repeat(21000)}))).status,413)
  const invalid = new Request("https://platform.example.test/api/reviews", { method:"POST", headers:{Origin:"https://platform.example.test","Content-Type":"application/json"},body:"{" })
  assert.equal((await api.POST(invalid)).status,400); assert.equal(state.rows.length,0)
})
test("email confirmation GET cannot mutate and owner endpoints require authentication", async () => {
  const { state, api } = fixture()
  assert.equal((await api.GET(new Request("https://platform.example.test/api/reviews?action=confirm&token=secret"))).status,400)
  for(const view of ["owner","export"]) assert.equal((await api.GET(new Request(`https://platform.example.test/api/reviews?websiteId=${websiteId}&view=${view}`))).status,401)
  assert.equal((await api.POST(request({action:"published",websiteId,id:websiteId,reason:"Test publication"}))).status,401)
  assert.equal(state.rows.length,0)
})
test("unavailable rate limiting fails closed and honeypots create no review or email", async () => {
  const { state, api } = fixture()
  await api.POST(request({...input,company:"spam"})); assert.equal(state.rows.length,0)
  state.rate = { allowed:false, reason:"unavailable" }
  assert.equal((await api.POST(request(input))).status,503); assert.equal(state.rows.length,0); assert.equal(state.messages.length,0)
})
