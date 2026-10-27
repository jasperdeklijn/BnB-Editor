import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import ts from "typescript"

const module = { exports: {} }
const compiled = ts.transpileModule(fs.readFileSync("lib/pricing.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const entitlements = { exports: {} }
const entitlementCode = ts.transpileModule(fs.readFileSync("lib/entitlements.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
Function("module", "exports", entitlementCode.outputText)(entitlements, entitlements.exports)
Function("module", "exports", "require", compiled.outputText)(module, module.exports, (specifier) => {
  assert.equal(specifier, "@/lib/entitlements")
  return entitlements.exports
})
const { calculateMonthlyPrice, formatPrice } = module.exports

test("Gold is recommended in the center while plan rank remains Bronze, Silver, Gold", () => {
  const { getMainPlans, getPopularPlan, PLAN_ORDER, FEATURE_COMPARISON, PRICING_PLANS } = module.exports
  const plans = getMainPlans()
  assert.deepEqual(plans.map((plan) => plan.id), ["bronze", "gold", "silver"])
  assert.deepEqual(PLAN_ORDER, ["bronze", "silver", "gold"])
  assert.equal(getPopularPlan().id, "gold")
  assert.deepEqual(plans.filter((plan) => plan.isPopular).map((plan) => [plan.id, plan.badge]), [["gold", "AANBEVOLEN"]])
  assert.equal(PRICING_PLANS.silver.badge, undefined)
  assert.ok(PRICING_PLANS.silver.features.includes("Onbeperkte secties"))
  const limits = FEATURE_COMPARISON.find((row) => row.feature === "Maximaal aantal secties")
  assert.equal(limits.silver, "Onbeperkt")
  assert.equal(limits.gold, "Onbeperkt")
})

test("pricing exposes published page quotas and VAT disclosure", () => {
  const { PRICING_PLANS,FEATURE_COMPARISON }=module.exports
  assert.ok(PRICING_PLANS.bronze.features.includes("3 gepubliceerde pagina's"))
  assert.ok(PRICING_PLANS.silver.features.includes("10 gepubliceerde pagina's"))
  const pages=FEATURE_COMPARISON.find(row=>row.feature==="Websitepagina's")
  assert.equal(pages.bronze,"3 gepubliceerd");assert.equal(pages.silver,"10 gepubliceerd");assert.equal(pages.gold,"Onbeperkt (fair-use)")
  for (const file of ["components/pricing/pricing-card.tsx","components/pricing/pricing-addons.tsx","components/billing/billing-client.tsx"]) assert.match(fs.readFileSync(file,"utf8"),/exclusief btw/i)
})

test("monthly totals include optional booking and multilingual, with languages free on Gold", () => {
  const expected = { bronze: [7.95, 22.90, 10.94, 25.89], silver: [14.95, 29.90, 17.94, 32.89], gold: [24.95, 39.90, 24.95, 39.90] }
  for (const [plan, totals] of Object.entries(expected)) {
    for (let index = 0; index < 4; index++) {
      assert.equal(calculateMonthlyPrice(plan, { bookingAddon: Boolean(index & 1), multilingualAddon: Boolean(index & 2) }), totals[index])
    }
  }
  assert.equal(formatPrice(module.exports.BOOKING_ADDON_MONTHLY_PRICE).replace(/\s/g, ""), "€14,95")
})

test("Booking & Facturatie includes booking, customer and invoice features on every plan", () => {
  const { BOOKING_ADDON_NAME, BOOKING_ADDON_FEATURES, FEATURE_COMPARISON, PRICING_PLANS } = module.exports
  assert.equal(BOOKING_ADDON_NAME, "Booking & Facturatie")
  assert.deepEqual(BOOKING_ADDON_FEATURES, ["Online boekingen", "Beschikbaarheid", "Boekingsbeheer", "Automatische bevestigingen", "Factuur vanuit boeking", "PDF-facturen", "Klantgegevens", "Factuurhistorie"])
  for (const feature of ["Online boekingssysteem", "Factuur vanuit boeking en PDF-facturen", "Klantgegevens en factuurhistorie"]) {
    const row = FEATURE_COMPARISON.find((item) => item.feature === feature)
    for (const plan of ["bronze", "silver", "gold"]) assert.equal(row[plan], BOOKING_ADDON_NAME)
  }
  assert.ok(PRICING_PLANS.gold.features.includes("Diensten beheren"))
  assert.ok(PRICING_PLANS.gold.features.includes("Meertaligheid"))
})

test("service mutations require entitlements in server actions and restrictive RLS", () => {
  const server = fs.readFileSync("lib/supabase/services.ts", "utf8")
  for (const name of ["createService", "updateService", "deleteService", "reorderServices"]) {
    const body = server.slice(server.indexOf(`export async function ${name}`)).split("export async function")[1]
    assert.ok(body.indexOf('assertCurrentUserRuntimeEntitlement(supabase, "service_management")') < body.indexOf('.from("services")'))
    assert.match(body, /assertCurrentUserRuntimeEntitlement\(supabase, "service_management"\)/)
  }
  const migration = fs.readFileSync("supabase/migrations/20260909120000_service_management_entitlements.sql", "utf8")
  const bootstrap = fs.readFileSync("supabase/init.sql", "utf8")
  assert.ok(bootstrap.replace(/\r\n/g, "\n").includes(migration.replace(/\r\n/g, "\n")))
  for (const operation of ["insert", "update", "delete"]) assert.ok(migration.includes(`as restrictive for ${operation} to authenticated`))
  assert.match(migration, /where user_id = auth.uid\(\)/)
  assert.match(migration, /if auth.uid\(\) is null then return false/)
})
