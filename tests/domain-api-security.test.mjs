import assert from "node:assert/strict"
import test from "node:test"
import { load } from "./helpers/load-admin-ai.mjs"

const row = { id: "domain-id", website_id: "website-id", domain: "example.com", status: "active", provider_domain: null, provider_project_id: null }
function setup({ owned = true } = {}) {
  let privilegedClients = 0, providerCalls = 0
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "owner", email: "owner@example.invalid" } }, error: null }) },
    from(table) {
      const result = { data: table === "website_domains" ? [row] : table === "websites" ? [{ id: "website-id" }] : [], error: null }
      return {
        select() { return this }, eq() { return this }, in() { return this },
        async maybeSingle() { return { data: table === "website_domains" ? row : owned ? { id: "website-id" } : null, error: null } },
        then(resolve) { return Promise.resolve(result).then(resolve) },
      }
    },
  }
  const imports = {
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/supabase/admin": { createAdminClient: async () => { privilegedClients++; return db } },
    "@/lib/audit-log": { logAuditEvent: async () => {} },
    "@/lib/rate-limit": { checkRateLimit: async () => ({ allowed: true }), getRateLimitKey: () => "test" },
    "@/lib/vercel-domains": {
      ...load("lib/vercel-domains.ts"),
      DOMAIN_PROVISIONING_COLUMNS: "domain,provider_domain,provider_project_id",
      isTrustedProvisionedDomain: () => false,
      removeDomainFromVercel: async () => { providerCalls++; return { success: true } },
    },
  }
  return { imports, counts: () => ({ privilegedClients, providerCalls }) }
}

test("domain deletion refuses unattested rows before privileged writes or provider access", async () => {
  const f = setup()
  const { DELETE } = load("app/api/domain/[domainId]/route.ts", f.imports)
  const response = await DELETE(new Request("https://app.example/api/domain/domain-id", { method: "DELETE" }), { params: Promise.resolve({ domainId: "domain-id" }) })
  assert.equal(response.status, 409)
  assert.deepEqual(f.counts(), { privilegedClients: 0, providerCalls: 0 })
})

test("another tenant's domain is rejected before privileged access", async () => {
  const f = setup({ owned: false })
  const { DELETE } = load("app/api/domain/[domainId]/route.ts", f.imports)
  const response = await DELETE(new Request("https://app.example/api/domain/domain-id", { method: "DELETE" }), { params: Promise.resolve({ domainId: "domain-id" }) })
  assert.equal(response.status, 404)
  assert.deepEqual(f.counts(), { privilegedClients: 0, providerCalls: 0 })
})

test("domain creation checks website ownership before creating a privileged client", async () => {
  const f = setup({ owned: false })
  const { POST } = load("app/api/domain/route.ts", f.imports)
  const response = await POST(new Request("https://app.example/api/domain", {
    method: "POST", body: JSON.stringify({ websiteId: "website-id", domain: "example.com" }),
  }))
  assert.equal(response.status, 404)
  assert.deepEqual(f.counts(), { privilegedClients: 0, providerCalls: 0 })
})

test("website deletion cannot use a legacy domain row for provider deletion", async () => {
  const f = setup()
  const { DELETE } = load("app/api/websites/delete/route.ts", f.imports)
  const response = await DELETE(new Request("https://app.example/api/websites/delete", { method: "DELETE", body: JSON.stringify({ websiteId: "website-id" }) }))
  assert.equal(response.status, 409)
  assert.deepEqual(f.counts(), { privilegedClients: 0, providerCalls: 0 })
})

test("account deletion checks every domain before any provider cleanup", async () => {
  const f = setup()
  const { DELETE } = load("app/api/account/route.ts", f.imports, { SUPABASE_SERVICE_ROLE_KEY: "test-only" })
  const response = await DELETE(new Request("https://app.example/api/account", { method: "DELETE", body: JSON.stringify({ confirmation: "owner@example.invalid" }) }))
  assert.equal(response.status, 409)
  assert.equal(f.counts().providerCalls, 0)
})
