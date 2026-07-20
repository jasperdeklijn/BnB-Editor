import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const sourcePath = path.resolve("lib/subscriptions.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
})
const module = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(module, module.exports, (specifier) => {
  if (specifier === "@/lib/pricing") {
    return { getPlanById: (planId) => ({ monthlyPrice: { bronze: 7.95, silver: 14.95, gold: 24.95 }[planId] }) }
  }
  throw new Error(`Unexpected runtime dependency: ${specifier}`)
})

const { getSubscriptionAccessNotice, hasMultilingualWebsiteAccess, resolveEffectivePlan } = module.exports
const now = new Date("2026-07-12T12:00:00.000Z")
const record = (status, overrides = {}) => ({
  id: "sub-1",
  user_id: "user-1",
  plan_id: "silver",
  status,
  current_price: 14.95,
  currency: "EUR",
  current_period_start: "2026-07-01T00:00:00.000Z",
  current_period_end: "2026-08-01T00:00:00.000Z",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  multilingual_addon_active: false,
  multilingual_addon_price: 2.99,
  stripe_multilingual_addon_item_id: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  ...overrides,
})

test("missing subscriptions receive the temporary Gold default", () => {
  assert.deepEqual(resolveEffectivePlan(null, now), {
    planId: "gold",
    storedPlanId: null,
    status: "none",
    source: "default_fallback",
  })
})

test("active and trial subscriptions use the stored plan", () => {
  assert.equal(resolveEffectivePlan(record("active"), now).planId, "silver")
  assert.equal(resolveEffectivePlan(record("trial", { plan_id: "gold" }), now).planId, "gold")
})

test("past-due and expired subscriptions use the temporary Gold default", () => {
  assert.equal(resolveEffectivePlan(record("past_due"), now).planId, "gold")
  assert.equal(resolveEffectivePlan(record("expired", { plan_id: "silver" }), now).planId, "gold")
})

test("canceled subscriptions retain access only through their paid-through date", () => {
  assert.equal(resolveEffectivePlan(record("canceled"), now).planId, "silver")
  assert.equal(
    resolveEffectivePlan(record("canceled", { current_period_end: "2026-07-01T00:00:00.000Z" }), now).planId,
    "gold",
  )
})

test("inactive states explain the temporary Gold default", () => {
  const resolved = {
    userId: "user-1",
    record: record("past_due"),
    ...resolveEffectivePlan(record("past_due"), now),
  }
  const notice = getSubscriptionAccessNotice(resolved)
  assert.match(notice, /standaardabonnement Gold/)
})

test("multilingual access is included in Gold and add-on based for paid Bronze or Silver", () => {
  const silver = record("active")
  const silverWithAddon = record("active", { multilingual_addon_active: true })

  assert.equal(hasMultilingualWebsiteAccess({
    userId: "user-1",
    record: silver,
    ...resolveEffectivePlan(silver, now),
  }), false)
  assert.equal(hasMultilingualWebsiteAccess({
    userId: "user-1",
    record: silverWithAddon,
    ...resolveEffectivePlan(silverWithAddon, now),
  }), true)
  assert.equal(hasMultilingualWebsiteAccess({
    userId: "user-1",
    record: record("active", { plan_id: "gold" }),
    ...resolveEffectivePlan(record("active", { plan_id: "gold" }), now),
  }), true)
})
