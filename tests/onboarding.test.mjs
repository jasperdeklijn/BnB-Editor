import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"

const nativeRequire = createRequire(import.meta.url)
const read = (file) => fs.readFileSync(path.resolve(file), "utf8")

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const sourcePath = path.resolve(relativePath)
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  })
  const module = { exports: {} }
  Function("module", "exports", "require", compiled.outputText)(
    module,
    module.exports,
    (specifier) => dependencies[specifier] ?? nativeRequire(specifier),
  )
  return module.exports
}

const slug = loadTypeScriptModule("lib/onboarding/slug.ts")
const schemas = loadTypeScriptModule("lib/onboarding/schemas.ts", {
  "@/lib/onboarding/slug": slug,
})
const returnTo = loadTypeScriptModule("lib/onboarding/return-to.ts")

test("onboarding slug normalization is ASCII, stable, and reserved-route aware", () => {
  assert.equal(slug.normalizeOnboardingSlug("  Café De Hoek!  "), "cafe-de-hoek")
  assert.equal(slug.isValidOnboardingSlug("cafe-de-hoek"), true)
  assert.equal(slug.isValidOnboardingSlug("Admin"), false)
  assert.equal(slug.isReservedOnboardingSlug("onboarding"), true)
})

test("onboarding schemas accept international input and reject invalid Dutch KvK numbers", () => {
  assert.equal(schemas.personalDetailsSchema.safeParse({
    firstName: "Élodie",
    lastName: "Martin",
    phone: "+33 6 12 34 56 78",
    jobTitle: null,
    locale: "fr-FR",
  }).success, true)

  const invalidCompany = schemas.companyDetailsSchema.safeParse({
    name: "Voorbeeld BV",
    category: "freelancer",
    country: "NL",
    city: "Utrecht",
    publicEmail: "info@voorbeeld.nl",
    publicPhone: null,
    chamberOfCommerceNumber: "1234",
    vatNumber: null,
  })
  assert.equal(invalidCompany.success, false)
  assert.equal(invalidCompany.error.flatten().fieldErrors.chamberOfCommerceNumber[0], "Een KvK-nummer bestaat uit acht cijfers.")

  const website = schemas.websiteSetupSchema.parse({
    title: "Café De Hoek",
    slug: "Café De Hoek",
    primaryGoal: "bookings",
    defaultLocale: "nl-NL",
    description: "",
    existingWebsiteUrl: "https://voorbeeld.nl",
  })
  assert.equal(website.slug, "cafe-de-hoek")
  assert.equal(website.description, null)
})

test("return paths accept only internal non-authentication routes", () => {
  assert.equal(returnTo.getSafeOnboardingReturnTo("/preview/mijn-site"), "/preview/mijn-site")
  assert.equal(returnTo.getSafeOnboardingReturnTo("https://example.com"), null)
  assert.equal(returnTo.getSafeOnboardingReturnTo("//example.com"), null)
  assert.equal(returnTo.getSafeOnboardingReturnTo("/auth/login"), null)
})

test("migration and bootstrap include secure resumable onboarding", () => {
  const migration = read("supabase/migrations/20260821120000_add_guided_onboarding.sql")
  const bootstrap = read("supabase/init.sql")
  for (const source of [migration, bootstrap]) {
    assert.match(source, /create table if not exists public\.profiles/)
    assert.match(source, /onboarding_completed_at timestamptz/)
    assert.match(source, /alter table public\.profiles enable row level security/)
    assert.match(source, /create_profile_after_auth_signup/)
    assert.match(source, /pg_advisory_xact_lock/)
    assert.match(source, /create or replace function public\.complete_onboarding/)
    assert.match(source, /onboarding_completed_at = coalesce\(onboarding_completed_at, now\(\)\)/)
  }
  assert.match(migration, /from auth\.users users/)
  assert.match(migration, /onboarding_step,[\s\S]*onboarding_completed_at[\s\S]*3,[\s\S]*now\(\)/)
})

test("route gating, accessible steps, slug checks, and settings integration stay connected", () => {
  const middleware = read("lib/supabase/middleware.ts")
  const shell = read("components/onboarding/onboarding-shell.tsx")
  const websiteStep = read("components/onboarding/website-setup-step.tsx")
  const profile = read("components/profile/profile-client.tsx")
  const business = read("components/business/business-details-client.tsx")
  const accountExport = read("app/api/account/export/route.ts")

  assert.match(middleware, /onboarding_completed_at/)
  assert.match(middleware, /returnTo/)
  assert.match(shell, /focusFirstInvalid/)
  assert.match(shell, /aria-live="polite"/)
  assert.match(websiteStep, /window\.setTimeout/)
  assert.match(websiteStep, /api\/onboarding\/slug/)
  assert.match(profile, /api\/profile/)
  assert.match(business, /chamberOfCommerceNumber/)
  assert.match(accountExport, /profile: profileResult\.data/)
})

test("starter generation personalizes core sections and responds to the website goal", () => {
  const starter = read("lib/onboarding/website-starter.ts")
  assert.match(starter, /input\.goal === "bookings"/)
  assert.match(starter, /input\.goal === "contact_requests"/)
  assert.match(starter, /input\.goal === "showcase"/)
  assert.match(starter, /data\.title = input\.businessName/)
  assert.match(starter, /data\.email = input\.email/)
})

