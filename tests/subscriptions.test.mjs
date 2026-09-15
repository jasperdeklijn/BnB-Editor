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
  if (specifier === "@/lib/entitlements" || specifier === "@/lib/reviews/shared") {
    const dependency = { exports: {} }
    const output = ts.transpileModule(fs.readFileSync(path.resolve(specifier.replace("@/", "") + ".ts"), "utf8"), {
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

test("review collection agrees with billing's effective Gold across subscription states", () => {
  const records = [null]
  for (const plan_id of ["bronze", "silver", "gold"]) {
    for (const status of ["active", "trial", "canceled", "past_due", "expired"]) {
      for (const current_period_end of [null, "2026-07-01T00:00:00Z", "2026-08-01T00:00:00Z"]) {
        records.push(record(status, { plan_id, current_period_end }))
      }
    }
  }
  for (const subscription of records) {
    const resolved = { userId: "user-1", record: subscription, ...resolveEffectivePlan(subscription, now) }
    assert.equal(hasSubscriptionCapability(resolved, "review_collection"), resolved.planId === "gold", JSON.stringify(subscription))
  }
})

test("active and trial subscriptions receive Gold while preserving their stored plan", () => {
  assert.equal(resolveEffectivePlan(record("active"), now).planId, "gold")
  assert.equal(resolveEffectivePlan(record("active"), now).storedPlanId, "silver")
  assert.equal(resolveEffectivePlan(record("trial", { plan_id: "gold" }), now).planId, "gold")
})

test("past-due and expired subscriptions use the temporary Gold default", () => {
  assert.equal(resolveEffectivePlan(record("past_due"), now).planId, "gold")
  assert.equal(resolveEffectivePlan(record("expired", { plan_id: "silver" }), now).planId, "gold")
})

test("canceled subscriptions receive Gold before and after their paid-through date", () => {
  assert.equal(resolveEffectivePlan(record("canceled"), now).planId, "gold")
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
  assert.match(notice, /tijdelijk gratis/)
})

test("multilingual access is temporarily included regardless of paid add-ons", () => {
  const silver = record("active")
  const silverWithAddon = record("active", { multilingual_addon_active: true })

  assert.equal(hasMultilingualWebsiteAccess({
    userId: "user-1",
    record: silver,
    ...resolveEffectivePlan(silver, now),
  }), true)
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

test("all features are free across stored plans and statuses without changing billing records", () => {
  for (const plan_id of ["bronze", "silver", "gold"]) {
    for (const status of ["active", "trial", "canceled", "past_due", "expired"]) {
      for (const booking_addon_active of [false, true]) {
        const row = record(status, { plan_id, booking_addon_active })
        const resolved = { userId: "user-1", record: row, ...resolveEffectivePlan(row, now) }
        const paidAddon = booking_addon_active && ["active", "trial", "canceled"].includes(status)
        assert.equal(hasBookingAddonAccess(resolved), true)
        for (const capability of ["booking_system", "availability_calendar", "automatic_booking_confirmations", "booking_management", "review_collection", "contact_form", "email_contact_requests", "email_quote_requests", "email_appointment_requests", "whatsapp_integration", "multilingual_websites", "priority_support", "service_management"]) {
          assert.equal(hasSubscriptionCapability(resolved, capability), true, `${plan_id}/${status}/${capability}`)
        }
        const billing = toUserBillingData(resolved)
        assert.equal(billing.addons.bookingAddon, paidAddon)
        assert.equal(billing.currentPrice, 0)
        assert.equal(billing.nextBillingDate, null)
        assert.equal(billing.defaultFeaturesIncluded, true)
        assert.equal(row.plan_id, plan_id)
        assert.equal(row.booking_addon_active, booking_addon_active)
        assert.equal(row.current_price, 14.95)
      }
    }
  }
  const missing = { userId: "user-1", record: null, ...resolveEffectivePlan(null, now) }
  assert.equal(hasBookingAddonAccess(missing), true)
  assert.equal(toUserBillingData(missing).currentPrice, 0)
  const expired = record("canceled", { booking_addon_active: true, current_period_end: "2026-07-01T00:00:00.000Z" })
  assert.equal(hasBookingAddonAccess({ userId: "user-1", record: expired, ...resolveEffectivePlan(expired, now) }), true)
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

test("subscription loading grants temporary booking access even before the add-on column exists", async () => {
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
    assert.equal(hasBookingAddonAccess(resolved), true)
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
