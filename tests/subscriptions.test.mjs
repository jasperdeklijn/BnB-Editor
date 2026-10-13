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

const { getSubscriptionPageLimit, getUserSubscription, getSubscriptionAccessNotice, hasMultilingualWebsiteAccess, hasMultipageWebsiteAccess, hasBookingAddonAccess, hasSubscriptionCapability, toUserBillingData, resolveEffectivePlan } = module.exports
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

test("missing and inactive subscriptions receive Bronze without add-ons", () => {
  assert.deepEqual(resolveEffectivePlan(null,now),{planId:"bronze",storedPlanId:null,status:"none",source:"default_fallback"})
  for(const status of ["past_due","expired"]) assert.equal(resolveEffectivePlan(record(status),now).planId,"bronze")
  assert.equal(resolveEffectivePlan(record("canceled"),now).planId,"silver")
  assert.equal(resolveEffectivePlan(record("canceled",{current_period_end:"2026-07-01T00:00:00Z"}),now).planId,"bronze")
})
test("stored active plans and add-ons govern every capability without changing billing records", () => {
  for(const plan_id of ["bronze","silver","gold"]) for(const status of ["active","trial","canceled","past_due","expired"]) for(const booking_addon_active of [false,true]) {
    const row=record(status,{plan_id,booking_addon_active,multilingual_addon_active:false})
    const snapshot=JSON.stringify(row)
    const resolved={userId:"user-1",record:row,...resolveEffectivePlan(row,now)}
    const paid=["active","trial","canceled"].includes(status)
    const plan=paid?plan_id:"bronze"
    assert.equal(resolved.planId,plan)
    assert.equal(getSubscriptionPageLimit(resolved),{bronze:3,silver:10,gold:null}[plan])
    assert.equal(hasMultipageWebsiteAccess(resolved),true)
    assert.equal(hasBookingAddonAccess(resolved),paid && booking_addon_active)
    for(const capability of ["booking_system","availability_calendar","automatic_booking_confirmations","booking_management"]) assert.equal(hasSubscriptionCapability(resolved,capability),paid && booking_addon_active)
    assert.equal(hasMultilingualWebsiteAccess(resolved),plan==="gold")
    assert.equal(hasSubscriptionCapability(resolved,"detailed_analytics"),plan!=="bronze")
    assert.equal(hasSubscriptionCapability(resolved,"advanced_analytics"),plan==="gold")
    assert.equal(hasSubscriptionCapability(resolved,"review_collection"),plan==="gold")
    assert.equal(hasSubscriptionCapability(resolved,"service_management"),plan==="gold" || (paid && booking_addon_active))
    const billing=toUserBillingData(resolved)
    assert.equal(billing.currentPrice,paid?14.95:0)
    assert.equal(billing.defaultFeaturesIncluded,false)
    assert.equal(billing.addons.bookingAddon,paid && booking_addon_active)
    assert.equal(JSON.stringify(row),snapshot)
  }
  const missing={userId:"user-1",record:null,...resolveEffectivePlan(null,now)}
  assert.equal(hasBookingAddonAccess(missing),false)
  assert.equal(toUserBillingData(missing).currentPrice,0)
})
test("multilingual add-on unlocks Bronze/Silver and Gold includes it", () => {
  for(const plan_id of ["bronze","silver","gold"]) for(const multilingual_addon_active of [false,true]){
    const row=record("active",{plan_id,multilingual_addon_active})
    assert.equal(hasMultilingualWebsiteAccess({userId:"user-1",record:row,...resolveEffectivePlan(row,now)}),plan_id==="gold"||multilingual_addon_active)
  }
})
test("inactive access notices preserve live content",()=>{
  const row=record("past_due")
  assert.match(getSubscriptionAccessNotice({userId:"user-1",record:row,...resolveEffectivePlan(row,now)}),/Bronze.*live content/)
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

test("subscription loading fails booking closed before the add-on column exists", async () => {
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
