import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("websites cannot reference another tenant's business", () => {
  const migration = read("supabase/migrations/20260907120000_production_security_hardening.sql")
  const bootstrap = read("supabase/init.sql")
  const templateRoute = read("app/api/templates/apply/route.ts")

  for (const sql of [migration, bootstrap]) {
    assert.match(sql, /unique \(id, user_id\)/)
    assert.match(sql, /foreign key \(business_id, user_id\)[\s\S]*references public\.businesses\(id, user_id\)/)
  }
  assert.match(templateRoute, /\.from\("businesses"\)[\s\S]*\.eq\("id", businessId\)[\s\S]*\.eq\("user_id", user\.id\)/)
  assert.match(templateRoute, /\.from\("websites"\)[\s\S]*\.eq\("id", websiteId\)[\s\S]*\.eq\("user_id", user\.id\)/)
})

test("the public image bucket enforces documented formats and size", () => {
  const migration = read("supabase/migrations/20260907120000_production_security_hardening.sql")
  const bootstrap = read("supabase/init.sql")

  for (const sql of [migration, bootstrap]) {
    assert.match(sql, /file_size_limit[\s\S]*5242880/)
    assert.match(sql, /allowed_mime_types[\s\S]*image\/jpeg[\s\S]*image\/png[\s\S]*image\/gif[\s\S]*image\/webp/)
    assert.doesNotMatch(sql, /allowed_mime_types[^;]*image\/svg\+xml/)
  }
})

test("anonymous website reads expose only immutable live snapshots", () => {
  const migration = read("supabase/migrations/20260907120000_production_security_hardening.sql")
  const bootstrap = read("supabase/init.sql")
  const loader = read("components/page-loader.tsx")
  const middleware = read("lib/supabase/middleware.ts")

  for (const sql of [migration, bootstrap]) {
    assert.match(sql, /function public\.get_public_website\(/)
    assert.match(sql, /select w\.id, w\.slug, w\.published, w\.live_snapshot/)
    assert.doesNotMatch(sql, /create policy "Anyone can view sections of published websites"/)
    assert.doesNotMatch(sql, /create policy "Anyone can view published website businesses"/)
  }
  assert.match(loader, /\.rpc\("get_public_website"/)
  assert.match(middleware, /\.rpc\("get_public_website"/)
})

test("the package test command uses the scoped cross-platform runner", () => {
  const packageJson = JSON.parse(read("package.json"))
  assert.equal(packageJson.scripts.test, "node scripts/run-tests.mjs")
})
