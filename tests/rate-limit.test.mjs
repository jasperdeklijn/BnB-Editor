import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"

const require = createRequire(import.meta.url)
function load(file, imports = {}, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const module = { exports: {} }
  Function("module", "exports", "require", ...Object.keys(globals), compiled.outputText)(
    module, module.exports, (name) => imports[name] ?? require(name), ...Object.values(globals),
  )
  return module.exports
}

function limiter(env, fetch) {
  return load("lib/rate-limit.ts", {}, {
    process: { env }, fetch, console: { error() {} },
  }).checkRateLimit
}

const production = {
  NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-key",
}

test("production distinguishes unavailable configuration and RPC from exhausted attempts", async () => {
  for (const check of [
    limiter({ NODE_ENV: "production" }),
    limiter(production, async () => new Response("missing RPC", { status: 404 })),
    limiter(production, async () => { throw new Error("network unavailable") }),
    limiter(production, async () => Response.json([{ allowed: "false", remaining: 7, reset_at: "bad" }])),
  ]) {
    const result = await check("login:test", 8, 900_000)
    assert.equal(result.allowed, false)
    assert.equal(result.reason, "unavailable")
  }
})

test("shared limiter sends hashed keys and preserves actual allow/deny decisions", async () => {
  for (const allowed of [true, false]) {
    const check = limiter(production, async (url, options) => {
      assert.equal(url, "https://example.supabase.co/rest/v1/rpc/check_rate_limit")
      const body = JSON.parse(options.body)
      assert.match(body.p_key_hash, /^[a-f0-9]{64}$/)
      assert.equal(body.p_limit, 8)
      assert.equal(body.p_window_seconds, 900)
      assert.equal(options.cache, "no-store")
      assert.ok(options.signal instanceof AbortSignal)
      return Response.json([{ allowed, remaining: allowed ? 7 : 0, reset_at: "2026-09-09T21:00:00Z" }])
    })
    const result = await check("login:192.0.2.1", 8, 900_000)
    assert.equal(result.allowed, allowed)
    assert.equal(result.reason, undefined)
  }
})

test("development fallback still enforces its local limit", async () => {
  const check = limiter({ NODE_ENV: "development" })
  assert.equal((await check("login:test", 1, 900_000)).allowed, true)
  const blocked = await check("login:test", 1, 900_000)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.reason, undefined)
})

test("login returns 503 for limiter outages and 429 only for exhausted attempts", async () => {
  for (const reason of ["unavailable", undefined]) {
    const { POST } = load("app/api/auth/login/route.ts", {
      "next/server": { NextResponse: Response },
      "@/lib/audit-log": { logAuditEvent() { assert.fail("must not audit a blocked login") } },
      "@/lib/rate-limit": {
        checkRateLimit: async () => ({ allowed: false, reason, resetAt: Date.now() + 900_000 }),
        getRateLimitKey: () => "login:test",
      },
      "@/lib/supabase/server": { createClient() { assert.fail("must not authenticate a blocked login") } },
      "@/lib/onboarding/config": { isOnboardingEnabled: () => false },
    })
    const response = await POST(new Request("https://example.test/api/auth/login", { method: "POST" }))
    assert.equal(response.status, reason ? 503 : 429)
    assert.ok(Number(response.headers.get("Retry-After")) > 0)
    const body = await response.json()
    assert.match(body.error, reason ? /tijdelijk niet beschikbaar/ : /Te veel inlogpogingen/)
  }
})
