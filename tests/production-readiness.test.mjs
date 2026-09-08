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

test("rate limiting is shared, atomic, hashed, and fail-closed in production", () => {
  const migration = read("supabase/migrations/20260908120000_pre_administration_readiness.sql")
  const bootstrap = read("supabase/init.sql")
  const limiter = read("lib/rate-limit.ts")

  for (const sql of [migration, bootstrap]) {
    assert.match(sql, /create table if not exists public\.rate_limit_buckets/)
    assert.match(sql, /on conflict \(key_hash\) do update/)
    assert.match(sql, /grant execute on function public\.check_rate_limit[\s\S]*to service_role/)
  }
  assert.match(limiter, /createHash\("sha256"\)/)
  assert.match(limiter, /rest\/v1\/rpc\/check_rate_limit/)
  assert.match(limiter, /NODE_ENV !== "production"/)
})

test("template apply and restore use one transactional RPC", () => {
  const migration = read("supabase/migrations/20260908120000_pre_administration_readiness.sql")
  const applyRoute = read("app/api/templates/apply/route.ts")
  const restoreRoute = read("app/api/templates/restore/route.ts")

  assert.match(migration, /function public\.apply_template_transaction\(/)
  assert.match(migration, /function public\.restore_template_transaction\(/)
  assert.match(applyRoute, /\.rpc\("apply_template_transaction"/)
  assert.match(restoreRoute, /\.rpc\("restore_template_transaction"/)
  assert.doesNotMatch(restoreRoute, /\.from\("website_sections"\)[\s\S]*\.delete\(\)/)
})

test("public snapshots do not contain private form delivery addresses", () => {
  const snapshot = read("lib/website-snapshot.ts")
  const requestRoute = read("app/api/requests/route.ts")
  const migration = read("supabase/migrations/20260908120000_pre_administration_readiness.sql")

  assert.doesNotMatch(snapshot, /ownerEmail:/)
  assert.doesNotMatch(snapshot, /userId: website\.user_id/)
  assert.match(snapshot, /recipientEmail: _privateRecipientEmail/)
  assert.match(snapshot, /formDestinationKey: row\.id/)
  assert.match(requestRoute, /website_form_destinations/)
  assert.doesNotMatch(requestRoute, /body\.recipientEmail/)
  assert.match(migration, /live_snapshot - 'ownerEmail'/)
})

test("image uploads are server validated and quota enforced", () => {
  const migration = read("supabase/migrations/20260908120000_pre_administration_readiness.sql")
  const uploadRoute = read("app/api/images/upload/route.ts")
  const imageClient = read("lib/user-images.ts")
  const imageLibrary = read("components/images/images-client.tsx")

  assert.match(migration, /USER_IMAGE_QUOTA_EXCEEDED/)
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /drop policy if exists "Users can upload their own images"/)
  assert.match(uploadRoute, /inspectImage\(originalBytes\)/)
  assert.match(uploadRoute, /createAdminClient/)
  assert.match(imageClient, /fetch\("\/api\/images\/upload"/)
  assert.match(imageLibrary, /uploadUserImage\(supabase, userId, file\)/)
  assert.doesNotMatch(imageLibrary, /\.upload\(originalPath/)
})

test("environment, health, and performance contracts are committed", () => {
  const ignore = read(".gitignore")
  const envExample = read(".env.example")
  const health = read("app/api/health/route.ts")
  const lighthouse = JSON.parse(read("lighthouserc.json"))

  assert.match(ignore, /!\.env\.example/)
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET", "SMTP_HOST", "VERCEL_ACCESS_TOKEN"]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"))
  }
  assert.match(health, /status: ready \? 200 : 503/)
  assert.equal(lighthouse.ci.assert.assertions["largest-contentful-paint"][1].maxNumericValue, 2500)
  assert.equal(lighthouse.ci.assert.assertions["cumulative-layout-shift"][1].maxNumericValue, 0.1)
})
