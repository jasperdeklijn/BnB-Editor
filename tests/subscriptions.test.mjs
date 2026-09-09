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
  if (specifier === "@/lib/entitlements") {
    const dependency = { exports: {} }
    const output = ts.transpileModule(fs.readFileSync(path.resolve("lib/entitlements.ts"), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    })
    Function("module", "exports", output.outputText)(dependency, dependency.exports)
    return dependency.exports
  }
  throw new Error(`Unexpected runtime dependency: ${specifier}`)
})

const { getUserSubscription, getSubscriptionAccessNotice, hasMultilingualWebsiteAccess, hasBookingAddonAccess, hasSubscriptionCapability, toUserBillingData, resolveEffectivePlan } = module.exports
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
  booking_addon_active: false,
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

test("booking access and billing follow the active add-on on every plan", () => {
  for (const plan_id of ["bronze", "silver", "gold"]) {
    for (const status of ["active", "trial", "canceled", "past_due", "expired"]) {
      for (const booking_addon_active of [false, true]) {
        const row = record(status, { plan_id, booking_addon_active })
        const resolved = { userId: "user-1", record: row, ...resolveEffectivePlan(row, now) }
        const expected = booking_addon_active && ["active", "trial", "canceled"].includes(status)
        assert.equal(hasBookingAddonAccess(resolved), expected)
        for (const capability of ["booking_system", "availability_calendar", "automatic_booking_confirmations", "booking_management"]) {
          assert.equal(hasSubscriptionCapability(resolved, capability), expected)
        }
        assert.equal(toUserBillingData(resolved).addons.bookingAddon, expected)
        assert.equal(hasSubscriptionCapability(resolved, "service_management"), resolved.planId === "gold" || expected)
      }
    }
  }
  const missing = { userId: "user-1", record: null, ...resolveEffectivePlan(null, now) }
  assert.equal(hasBookingAddonAccess(missing), false)
  const expired = record("canceled", { booking_addon_active: true, current_period_end: "2026-07-01T00:00:00.000Z" })
  assert.equal(hasBookingAddonAccess({ userId: "user-1", record: expired, ...resolveEffectivePlan(expired, now) }), false)
})

function subscriptionClient(responses) {
  const calls = []
  return {
    calls,
    from(table) {
      assert.equal(table, "subscriptions")
      return {
        select(columns) {
          calls.push(columns.split(", "))
          return {
            eq(column, value) {
              assert.equal(column, "user_id")
              assert.equal(value, "user-1")
              return { maybeSingle: async () => responses[calls.length - 1] }
            },
          }
        },
      }
    },
  }
}

test("subscription loading supports the pre-migration database without granting booking", async () => {
  for (const error of [
    { code: "42703", message: "column subscriptions.booking_addon_active does not exist" },
    { code: "PGRST204", message: "Could not find the 'booking_addon_active' column of 'subscriptions' in the schema cache" },
  ]) {
    const legacy = record("active", { plan_id: "gold", multilingual_addon_active: true })
    delete legacy.booking_addon_active
    const client = subscriptionClient([{ data: null, error }, { data: legacy, error: null }])
    const resolved = await getUserSubscription(client, "user-1")
    assert.equal(resolved.planId, "gold")
    assert.equal(resolved.source, "subscription")
    assert.equal(hasMultilingualWebsiteAccess(resolved), true)
    assert.equal(hasBookingAddonAccess(resolved), false)
    assert.equal(toUserBillingData(resolved).addons.bookingAddon, false)
    assert.equal(client.calls.length, 2)
    assert.ok(client.calls[0].includes("booking_addon_active"))
    assert.deepEqual(client.calls[1], client.calls[0].filter((column) => column !== "booking_addon_active"))
  }
})

test("migrated subscriptions read the booking add-on without a fallback query", async () => {
  const client = subscriptionClient([{ data: record("active", { booking_addon_active: true }), error: null }])
  const resolved = await getUserSubscription(client, "user-1")
  assert.equal(hasBookingAddonAccess(resolved), true)
  assert.equal(client.calls.length, 1)
})

test("subscription schema fallback preserves real database errors", async () => {
  for (const error of [
    { code: "42501", message: "permission denied for table subscriptions" },
    { code: "42703", message: "column subscriptions.multilingual_addon_active does not exist" },
    { code: "08006", message: "connection failure" },
  ]) {
    const client = subscriptionClient([{ data: null, error }])
    await assert.rejects(getUserSubscription(client, "user-1"), { message: `Could not resolve subscription: ${error.message}` })
    assert.equal(client.calls.length, 1)
  }
  const client = subscriptionClient([
    { data: null, error: { code: "42703", message: "column subscriptions.booking_addon_active does not exist" } },
    { data: null, error: { code: "42501", message: "permission denied" } },
  ])
  await assert.rejects(getUserSubscription(client, "user-1"), /permission denied/)
  assert.equal(client.calls.length, 2)
})
