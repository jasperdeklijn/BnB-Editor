import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test, { afterEach } from "node:test"
import ts from "typescript"

const sourcePath = path.resolve("lib/vercel-domains.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
})
const domainModule = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(domainModule, domainModule.exports, (specifier) => {
  throw new Error(`vercel-domains.ts must remain runtime dependency-free: ${specifier}`)
})

const {
  addDomainToVercel,
  normalizeDomain,
  removeDomainFromVercel,
  isTrustedProvisionedDomain,
  validateDomain,
} = domainModule.exports

const originalFetch = globalThis.fetch
const originalEnv = {
  token: process.env.VERCEL_ACCESS_TOKEN,
  project: process.env.VERCEL_PROJECT_ID,
  team: process.env.VERCEL_TEAM_ID,
}

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalEnv.token === undefined) delete process.env.VERCEL_ACCESS_TOKEN
  else process.env.VERCEL_ACCESS_TOKEN = originalEnv.token
  if (originalEnv.project === undefined) delete process.env.VERCEL_PROJECT_ID
  else process.env.VERCEL_PROJECT_ID = originalEnv.project
  if (originalEnv.team === undefined) delete process.env.VERCEL_TEAM_ID
  else process.env.VERCEL_TEAM_ID = originalEnv.team
})

test("normalizes and validates customer domain names", () => {
  assert.equal(normalizeDomain(" HTTPS://WWW.Example.COM/ "), "example.com")
  assert.equal(validateDomain("example.com"), null)
  assert.match(validateDomain("localhost"), /lokaal adres/i)
  assert.match(validateDomain("preview.flexpagina.nl"), /platformdomein/i)
  assert.match(validateDomain("example.com/path"), /protocol, pad of poort/i)
  assert.match(validateDomain("bad_label.example"), /geldige domeinnaam/i)
})

test("requires configured Vercel project credentials", async () => {
  delete process.env.VERCEL_ACCESS_TOKEN
  delete process.env.VERCEL_PROJECT_ID
  const result = await addDomainToVercel("example.com")
  assert.equal(result.success, false)
  assert.equal(result.skipped, true)
})

test("does not adopt an existing project domain as customer provisioning evidence", async () => {
  process.env.VERCEL_ACCESS_TOKEN = "token"
  process.env.VERCEL_PROJECT_ID = "project"
  process.env.VERCEL_TEAM_ID = "team"
  const requests = []
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), method: init.method || "GET" })
    if (requests.length === 1) return Response.json({ error: { message: "exists" } }, { status: 409 })
    return Response.json({ name: "example.com" }, { status: 200 })
  }

  const result = await addDomainToVercel("example.com")
  assert.equal(result.success, false)
  assert.equal(result.provisioning, undefined)
  assert.deepEqual(requests.map((request) => request.method), ["POST"])
  assert.match(requests[0].url, /teamId=team/)
})

test("only a matching successful create response produces project-bound evidence", async () => {
  process.env.VERCEL_ACCESS_TOKEN = "token"
  process.env.VERCEL_PROJECT_ID = "project"
  globalThis.fetch = async () => Response.json({ name: "example.com", projectId: "project" }, { status: 201 })
  const result = await addDomainToVercel("example.com")
  assert.equal(result.success, true)
  assert.deepEqual(result.provisioning, { provider_domain: "example.com", provider_project_id: "project" })
  globalThis.fetch = async () => Response.json({ name: "other.example", projectId: "project" }, { status: 201 })
  assert.equal((await addDomainToVercel("example.com")).success, false)
})

test("forged, legacy, reserved and wrong-project domains never reach the provider", async () => {
  process.env.VERCEL_ACCESS_TOKEN = "token"
  process.env.VERCEL_PROJECT_ID = "project"
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error("unexpected provider call") }
  for (const record of [
    { domain: "example.com", provider_domain: null, provider_project_id: null },
    { domain: "example.com", provider_domain: "other.example", provider_project_id: "project" },
    { domain: "example.com", provider_domain: "example.com", provider_project_id: "other-project" },
    { domain: "flexpagina.nl", provider_domain: "flexpagina.nl", provider_project_id: "project" },
    { domain: "preview.flexpagina.nl", provider_domain: "preview.flexpagina.nl", provider_project_id: "project" },
  ]) {
    assert.equal(isTrustedProvisionedDomain(record), false)
    assert.equal((await removeDomainFromVercel(record)).success, false)
  }
  assert.equal((await addDomainToVercel("flexpagina.nl")).success, false)
  assert.equal(calls, 0)
})

test("treats a Vercel 404 as an already completed removal", async () => {
  process.env.VERCEL_ACCESS_TOKEN = "token"
  process.env.VERCEL_PROJECT_ID = "project"
  globalThis.fetch = async () => Response.json({}, { status: 404 })

  const result = await removeDomainFromVercel({ domain: "example.com", provider_domain: "example.com", provider_project_id: "project" })
  assert.equal(result.success, true)
  assert.equal(result.status, 404)
})
