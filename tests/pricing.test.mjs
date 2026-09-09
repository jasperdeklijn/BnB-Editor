import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import ts from "typescript"

const module = { exports: {} }
const compiled = ts.transpileModule(fs.readFileSync("lib/pricing.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
Function("module", "exports", compiled.outputText)(module, module.exports)
const { calculateMonthlyPrice, formatPrice } = module.exports

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
  assert.ok(bootstrap.includes(migration))
  for (const operation of ["insert", "update", "delete"]) assert.ok(migration.includes(`as restrictive for ${operation} to authenticated`))
  assert.match(migration, /where user_id = auth.uid\(\)/)
  assert.match(migration, /if auth.uid\(\) is null then return false/)
})
