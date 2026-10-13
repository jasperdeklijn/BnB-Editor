import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const sourcePath = path.resolve("lib/entitlements.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
})

const module = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(module, module.exports, () => {
  throw new Error("entitlements.ts must remain runtime dependency-free")
})

const {
  ENTITLEMENT_PLAN_ORDER,
  getMinimumPlanForCapability,
  getMinimumPlanForSection,
  getRequestEmailCapability,
  getRequestSubmissionCapability,
  getSectionCapabilities,
  inspectWebsiteEntitlements,
  planMeetsRequirement,
} = module.exports

const section = (id, type, data = {}) => ({ id, type, data })

test("published caps are 3/10/unlimited independently of add-ons and free features", () => {
  assert.equal(getMinimumPlanForCapability("multipage_websites"), "bronze")
  for (const [plan, allowed, blocked, required] of [["bronze",3,4,"silver"],["silver",10,11,"gold"],["gold",10000,null,null]]) {
    assert.equal(inspectWebsiteEntitlements(plan,{sections:[],pageCount:allowed}).allowed,true)
    if (blocked) {
      const result=inspectWebsiteEntitlements(plan,{sections:[],pageCount:blocked,hasBookingAccess:true,capabilityOverrides:["multipage_websites"]})
      assert.equal(result.allowed,false); assert.equal(result.requiredPlan,required); assert.equal(result.violations[0].code,"page.limit_exceeded")
    }
  }
  assert.equal(inspectWebsiteEntitlements("gold",{sections:[],pageCount:4,publishedPageLimit:3}).allowed,false)
})

test("plan order and every section entitlement are explicit", () => {
  assert.deepEqual(ENTITLEMENT_PLAN_ORDER, ["bronze", "silver", "gold"])
  for (const type of ["nav", "hero", "about", "services", "contact", "map", "footer", "request_form"]) {
    assert.equal(getMinimumPlanForSection(type), "bronze")
  }
  for (const type of ["gallery", "features", "testimonials", "faq", "opening_hours", "pricing", "team", "cta"]) {
    assert.equal(getMinimumPlanForSection(type), "bronze")
  }
})

test("plan comparison follows Bronze, Silver, Gold", () => {
  assert.equal(planMeetsRequirement("bronze", "silver"), false)
  assert.equal(planMeetsRequirement("silver", "silver"), true)
  assert.equal(planMeetsRequirement("gold", "silver"), true)
})

test("all plans retain unrestricted core builder sections", () => {
  for (const plan of ["bronze","silver","gold"]) assert.equal(inspectWebsiteEntitlements(plan,{sections:Array.from({length:100},(_,i)=>section(String(i),"gallery"))}).allowed,true)
})

test("Bronze and Silver have no section-count limit", () => {
  for (const count of [10, 11, 100]) {
    const sections = Array.from({ length: count }, (_, index) => section(String(index), "hero"))
    assert.equal(inspectWebsiteEntitlements("silver", { sections }).allowed, true)
    const bronze = inspectWebsiteEntitlements("bronze", { sections })
    assert.equal(bronze.allowed, true)
    assert.equal(bronze.requiredPlan, "bronze")
  }
})

test("Gold has no section-count limit", () => {
  const sections = Array.from({ length: 100 }, (_, index) => section(String(index), "hero"))
  assert.equal(inspectWebsiteEntitlements("gold", { sections }).allowed, true)
})

test("gallery is included in Bronze", () => {
  assert.equal(inspectWebsiteEntitlements("bronze",{sections:[section("gallery","gallery")]}).allowed,true)
})

test("mixed-tier section settings are inspected independently", () => {
  assert.deepEqual(getSectionCapabilities(section("contact", "request_form", { requestType: "contact" })), ["contact_form"])
  assert.deepEqual(getSectionCapabilities(section("quote", "request_form", { requestType: "quote" })), ["email_quote_requests"])
  assert.deepEqual(getSectionCapabilities(section("booking", "services", { bookingSpaceEnabled: true })), ["booking_system"])

  const silverResult = inspectWebsiteEntitlements("silver", {
    sections: [section("booking", "services", { bookingSpaceEnabled: true })],
  })
  assert.equal(silverResult.allowed, false)
  assert.equal(silverResult.violations[0].requiredAddon, "bookingAddon")
  assert.equal(silverResult.violations[0].capability, "booking_system")
})

test("all standalone capability tiers are represented", () => {
  for (const capability of [
    "contact_form",
    "email_contact_requests",
    "email_quote_requests",
    "email_appointment_requests",
    "whatsapp_integration",
    "booking_system",
    "availability_calendar",
    "automatic_booking_confirmations",
    "booking_management",
    "multilingual_websites",
    "priority_support",
    "service_management",
  ]) {
    assert.ok(getMinimumPlanForCapability(capability))
  }

  const result = inspectWebsiteEntitlements("bronze", {
    sections: [],
    enabledCapabilities: ["whatsapp_integration", "availability_calendar"],
  })
  assert.equal(result.requiredPlan, "silver")
  assert.equal(result.violations.length, 2)
})

test("multilingual websites require Gold unless the billing add-on overrides the capability", () => {
  const blocked = inspectWebsiteEntitlements("silver", {
    sections: [],
    enabledCapabilities: ["multilingual_websites"],
  })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.violations[0].capability, "multilingual_websites")
  assert.equal(blocked.requiredPlan, "gold")

  const withAddon = inspectWebsiteEntitlements("silver", {
    sections: [],
    enabledCapabilities: ["multilingual_websites"],
    capabilityOverrides: ["multilingual_websites"],
  })
  assert.equal(withAddon.allowed, true)
})

test("public request types map to the correct runtime capability", () => {
  assert.equal(getRequestSubmissionCapability("contact"), "contact_form")
  assert.equal(getRequestSubmissionCapability("quote"), "email_quote_requests")
  assert.equal(getRequestSubmissionCapability("appointment"), "email_appointment_requests")
  assert.equal(getRequestSubmissionCapability("whatsapp"), "whatsapp_integration")
  assert.equal(getRequestSubmissionCapability("booking_request"), "booking_system")
  assert.equal(getRequestEmailCapability("contact"), "email_contact_requests")
  assert.equal(getRequestEmailCapability("whatsapp"), null)
})

test("booking requires the add-on on every plan and preserves section limits", () => {
  for (const plan of ["bronze", "silver", "gold"]) {
    const input = {
      sections: [section("booking", "services", { bookingSpaceEnabled: true })],
      enabledCapabilities: ["availability_calendar", "automatic_booking_confirmations", "booking_management"],
    }
    const blocked = inspectWebsiteEntitlements(plan, input)
    assert.equal(blocked.allowed, false)
    assert.equal(blocked.violations.length, 4)
    assert.ok(blocked.violations.every((violation) => violation.requiredAddon === "bookingAddon"))
    assert.equal(inspectWebsiteEntitlements(plan, { ...input, hasBookingAccess: true }).allowed, true)
  }
  const bronze = inspectWebsiteEntitlements("bronze", {
    hasBookingAccess: true,
    sections: Array.from({ length: 7 }, (_, index) => section(String(index), "services", { bookingSpaceEnabled: true })),
  })
  assert.equal(bronze.allowed, true)
})

test("service management is included in Gold and available through Booking & Facturatie", () => {
  for (const plan of ["bronze", "silver", "gold"]) {
    const input = { sections: [], enabledCapabilities: ["service_management"] }
    assert.equal(inspectWebsiteEntitlements(plan, input).allowed, plan === "gold")
    assert.equal(inspectWebsiteEntitlements(plan, { ...input, hasBookingAccess: true }).allowed, true)
  }
})
