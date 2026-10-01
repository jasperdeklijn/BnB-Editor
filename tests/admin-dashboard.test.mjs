import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import { createRequire } from "node:module"

const nativeRequire = createRequire(import.meta.url)
function load(relative, overrides = {}) {
  const filename = path.resolve(relative)
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  Function("module", "exports", "require", source)(module, module.exports, (specifier) => {
    if (specifier in overrides) return overrides[specifier]
    if (specifier === "server-only") return {}
    if (specifier === "./model" || specifier === "@/lib/admin/model") return model
    return nativeRequire(specifier)
  })
  return module.exports
}
const model = load("lib/admin/model.ts")

test("customer search groups drafts/live sites by owner and searches every domain", () => {
  const customers = [
    { id: "b", email: "b@example.com", created_at: "2026-08-01", user_metadata: { name: "Bram" } },
    { id: "a", email: "a@example.com", created_at: "2026-08-01", user_metadata: { full_name: "Anna" } },
    { id: "empty", email: "new@example.com", created_at: "2026-08-01" },
  ]
  const websites = [{ id: "a1", user_id: "a", title: "Tuin", slug: "tuin", published: false }, { id: "a2", user_id: "a", title: "Huis", slug: "huis", published: true }, { id: "b1", user_id: "b", title: "Winkel", slug: "winkel", published: true }]
  const domains = [{ website_id: "a1", domain: "extra.example.nl", status: "pending", is_primary: false }]
  const byCustomer = model.groupCustomers(customers, websites, domains, "ANNA")
  assert.deepEqual(byCustomer.map((group) => [group.customer.id, group.websites.map((site) => site.id)]), [["a", ["a1", "a2"]]])
  assert.deepEqual(model.groupCustomers(customers, websites, domains, "extra.example.nl").map((group) => [group.customer.id, group.websites.map((site) => site.id), group.totalWebsites]), [["a", ["a1"], 2]])
  assert.equal(model.groupCustomers(customers, websites, domains, "new@example.com")[0].websites.length, 0)
  assert.equal(model.groupCustomers(customers, websites, domains, "missing").length, 0)
  assert.equal(model.groupCustomers(customers, websites, domains, "").length, 3)
})

test("period comparisons use adjacent non-overlapping windows and handle zero/error states", () => {
  const bounds = model.periodBounds(7, new Date("2026-10-01T12:00:00Z"))
  const customers = [bounds.now, bounds.start, bounds.previous, "2026-09-24T11:59:59.999Z", "2026-09-17T11:59:59.999Z"].map((created_at) => ({ created_at }))
  assert.deepEqual(model.countNewAccounts(customers, bounds), { current: 1, previous: 2 })
  assert.deepEqual(model.countNewAccounts([{ created_at: "2026-09-24T12:00:00+00:00" }, { created_at: "2026-09-24T14:00:00.000000+02:00" }], bounds), { current: 2, previous: 0 })
  assert.equal(model.comparison(4, 2), "+100% ten opzichte van vorige periode")
  assert.equal(model.comparison(1, 0), "+1 · vorige periode 0")
  assert.equal(model.comparison(null, 4), "Vergelijking niet beschikbaar")
  assert.equal(model.periodDays("999"), 30)
  assert.equal(model.periodDays(["90"]), 90)
})

function serverWith({ user = { app_metadata: { role: "admin" } }, client = {}, authError = null } = {}) {
  let privilegedCalls = 0
  const server = load("lib/admin/server.ts", {
    react: { cache: (fn) => fn },
    "next/navigation": { redirect: (href) => { throw new Error(`redirect:${href}`) }, notFound: () => { throw new Error("not-found") } },
    "@/lib/security": load("lib/security.ts"),
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
    "@/lib/supabase/admin": { createAdminClient: async () => { privilegedCalls++; return client } },
  })
  return { server, privilegedCalls: () => privilegedCalls }
}

test("signed-out and ordinary customers never initialize a service-role client", async () => {
  for (const [user, message] of [[null, /redirect:\/auth\/login/], [{ app_metadata: {}, user_metadata: { role: "admin" } }, /not-found/]]) {
    const fixture = serverWith({ user })
    await assert.rejects(fixture.server.adminDatabase(), message)
    assert.equal(fixture.privilegedCalls(), 0)
  }
})

test("pagination survives a lower hosted row cap and propagates mid-page errors", async () => {
  const { server } = serverWith()
  const source = Array.from({ length: 8 }, (_, id) => ({ id }))
  const offsets = []
  const rows = await server.allRows(async (from, to) => { offsets.push(from); return { data: source.slice(from, Math.min(to + 1, from + 3)), error: null } })
  assert.deepEqual(rows, source)
  assert.deepEqual(offsets, [0, 3, 6, 8])
  await assert.rejects(server.allRows(async (from) => ({ data: from ? null : [{ id: 1 }], error: from ? new Error("unavailable") : null })), /unavailable/)
  const users = await server.allCustomers({ auth: { admin: { listUsers: async ({ page }) => ({ data: { users: page === 1 ? source.slice(0, 3) : page === 2 ? source.slice(3, 6) : source.slice(6), total: 8 }, error: null }) } } })
  assert.equal(users.length, 8)
})

test("overview keeps failed counts unavailable and builds specific attention links", async () => {
  const calls = []
  const admin = {
    from(table) {
      const call = { table, filters: [], options: null }
      calls.push(call)
      const chain = new Proxy({}, { get(_target, key) {
        if (key === "then") return (resolve) => {
          let data = []; let count = 0; let error = null
          if (table === "subscriptions") { error = new Error("missing table"); count = null }
          if (table === "audit_logs") error = new Error("unavailable")
          if (table === "mail_threads" && call.filters.some(([name]) => name === "gt")) { data = [{ id: "mail-1", subject_normalized: "Help", contact_email: "a@example.com", last_message_at: "2026-09-25T00:00:00Z" }]; count = 1 }
          if (table === "agent_approvals") { data = [{ id: "approval-1", requested_at: "2026-09-25T00:00:00Z" }]; count = 1 }
          if (table === "agent_jobs") { data = [{ id: "job-1", status: "dead_letter", created_at: "2026-09-25T00:00:00Z" }]; count = 1 }
          if (table === "website_transfer_requests") { data = [{ id: "transfer-1", business_name: "Anna", status: "corrections", created_at: "2026-09-25T00:00:00Z" }]; count = 1 }
          resolve({ data, count, error })
        }
        return (...args) => { call.filters.push([key, ...args]); if (key === "select") call.options = args[1]; return chain }
      } })
      return chain
    },
  }
  const overview = load("lib/admin/overview.ts", { "./server": { adminDatabase: async () => admin, allCustomers: async () => [], allWebsites: async () => [] } })
  const data = await overview.loadOverview(30)
  assert.equal(data.paid, null)
  assert.equal(data.live, 0)
  assert.equal(data.logs, null)
  assert.deepEqual(data.templates, [])
  assert.equal(data.attention[0].items[0].href, "/admin/mailbox?thread=mail-1")
  assert.equal(data.attention[1].items[0].href, "/admin/agents?approval=approval-1#approval-approval-1")
  assert.equal(data.attention[2].items[0].href, "/admin/agents?job=job-1#job-job-1")
  assert.equal(data.attention[3].items[0].description, "Correcties verwerken")
  const paid = calls.find((call) => call.table === "subscriptions")
  assert.ok(paid.filters.some((filter) => filter[0] === "gt" && filter[1] === "current_price" && filter[2] === 0))
  const pending = calls.find((call) => call.table === "agent_approvals")
  assert.ok(pending.filters.some((filter) => filter[0] === "or" && filter[1].startsWith("expires_at.is.null,expires_at.gt.")))
  const visits = calls.filter((call) => call.table === "website_visits")
  assert.equal(visits[0].filters.find((filter) => filter[0] === "gte")[2], visits[1].filters.find((filter) => filter[0] === "lt")[2])
})

test("query and metadata input stay bounded and escaped", () => {
  assert.equal(model.normalizeQuery(["  term  ", "ignored"]), "term")
  assert.equal(model.normalizeQuery("a".repeat(300)).length, 200)
  assert.equal(model.escapeLike("a_%@example.com"), "a\\_\\%@example.com")
  assert.equal(model.customerName({ user_metadata: { full_name: " ", name: "Anna" } }), "Anna")
  assert.equal(model.auditLabel("website.published"), "Website gepubliceerd")
  assert.equal(model.auditLabel("unknown.action"), "Platformactie geregistreerd")
})

test("an old mailbox deep link loads its own messages and drafts beyond the recent-list cap", async () => {
  const oldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const recent = { id: "recent", status: "closed", last_message_at: "2026-10-01T00:00:00Z" }
  const old = { id: oldId, status: "new", last_message_at: "2026-08-01T00:00:00Z" }
  const selectedCalls = []
  const client = { from(table) {
    let selected = false; let single = false; let filtered = false
    const chain = new Proxy({}, { get(_target, key) {
      if (key === "then") return (resolve) => {
        let data = []
        if (table === "mail_threads") data = selected ? [old] : filtered ? [old] : [recent]
        if (table === "mail_messages") data = selected ? [{ id: "old-message", thread_id: oldId, text_body: "Older support message", created_at: old.last_message_at }] : [{ id: "recent-message", thread_id: recent.id, created_at: recent.last_message_at }]
        if (table === "mail_drafts" && selected) data = [{ id: "old-draft", thread_id: oldId, created_at: old.last_message_at }]
        resolve({ data: single ? data[0] ?? null : data, error: null })
      }
      return (...args) => {
        if (key === "eq") { selected = true; selectedCalls.push([table, ...args]) }
        if (key === "maybeSingle") single = true
        if (key === "in" && table === "mail_threads") filtered = true
        return chain
      }
    } })
    return chain
  } }
  const MailboxDashboard = () => null
  const page = load("app/admin/mailbox/page.tsx", {
    "@/components/admin/mailbox-dashboard": { MailboxDashboard },
    "@/lib/mail/config": { getMailConfigurationState: () => ({ configured: true }) },
    "@/lib/security": { isAdmin: () => true },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) } }) },
    "@/lib/supabase/admin": { createAdminClient: async () => client },
    "next/navigation": { notFound: () => { throw new Error("not-found") }, redirect: () => { throw new Error("redirect") } },
  })
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-fixture-only"
  try {
    const tree = await page.default({ searchParams: Promise.resolve({ thread: oldId, filter: "open" }) })
    function find(node) {
      if (Array.isArray(node)) return node.map(find).find(Boolean)
      if (!node || typeof node !== "object") return null
      if (node.type === MailboxDashboard) return node.props
      return find(node.props?.children)
    }
    const props = find(tree)
    assert.equal(props.initialThreadId, oldId)
    assert.equal(props.initialFilter, "open")
    assert.ok(props.initialThreads.some((thread) => thread.id === oldId))
    assert.ok(props.initialMessages.some((message) => message.text_body === "Older support message"))
    assert.ok(props.initialDrafts.some((draft) => draft.id === "old-draft"))
    assert.ok(selectedCalls.some(([table, column, value]) => table === "mail_messages" && column === "thread_id" && value === oldId))
  } finally {
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  }
})
