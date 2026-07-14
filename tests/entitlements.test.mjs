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

test("plan order and every section entitlement are explicit", () => {
  assert.deepEqual(ENTITLEMENT_PLAN_ORDER, ["bronze", "silver", "gold"])
  for (const type of ["nav", "hero", "about", "services", "contact", "map", "footer", "request_form"]) {
    assert.equal(getMinimumPlanForSection(type), "bronze")
  }
  for (const type of ["gallery", "features", "testimonials", "faq", "opening_hours", "pricing", "team", "cta"]) {
    assert.equal(getMinimumPlanForSection(type), "silver")
  }
})

test("plan comparison follows Bronze, Silver, Gold", () => {
  assert.equal(planMeetsRequirement("bronze", "silver"), false)
  assert.equal(planMeetsRequirement("silver", "silver"), true)
  assert.equal(planMeetsRequirement("gold", "silver"), true)
})

test("Bronze section-count boundaries are 6 allowed and 7 blocked by Silver", () => {
  const six = Array.from({ length: 6 }, (_, index) => section(String(index), "hero"))
  assert.equal(inspectWebsiteEntitlements("bronze", { sections: six }).allowed, true)

  const result = inspectWebsiteEntitlements("bronze", { sections: [...six, section("7", "about")] })
  assert.equal(result.allowed, false)
  assert.deepEqual(result.violations[0], {
    code: "section.limit_exceeded",
    label: "Maximaal 6 secties in bronze",
    currentPlan: "bronze",
    requiredPlan: "silver",
    actualCount: 7,
    allowedCount: 6,
  })
})

test("Silver section-count boundaries are 10 allowed and 11 blocked by Gold", () => {
  const ten = Array.from({ length: 10 }, (_, index) => section(String(index), "hero"))
  assert.equal(inspectWebsiteEntitlements("silver", { sections: ten }).allowed, true)
  const result = inspectWebsiteEntitlements("silver", { sections: [...ten, section("11", "hero")] })
  assert.equal(result.violations[0].requiredPlan, "gold")
})

test("Gold has no section-count limit", () => {
  const sections = Array.from({ length: 100 }, (_, index) => section(String(index), "hero"))
  assert.equal(inspectWebsiteEntitlements("gold", { sections }).allowed, true)
})

test("Silver sections remain editable but are reported for Bronze", () => {
  const result = inspectWebsiteEntitlements("bronze", { sections: [section("gallery", "gallery")] })
  assert.equal(result.allowed, false)
  assert.equal(result.requiredPlan, "silver")
  assert.deepEqual(result.violations.map((violation) => violation.code), ["section.requires_plan"])
  assert.equal(result.violations[0].sectionId, "gallery")
})

test("mixed-tier section settings are inspected independently", () => {
  assert.deepEqual(getSectionCapabilities(section("contact", "request_form", { requestType: "contact" })), ["contact_form"])
  assert.deepEqual(getSectionCapabilities(section("quote", "request_form", { requestType: "quote" })), ["email_quote_requests"])
  assert.deepEqual(getSectionCapabilities(section("booking", "services", { bookingSpaceEnabled: true })), ["booking_system"])

  const silverResult = inspectWebsiteEntitlements("silver", {
    sections: [section("booking", "services", { bookingSpaceEnabled: true })],
  })
  assert.equal(silverResult.allowed, false)
  assert.equal(silverResult.requiredPlan, "gold")
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
    "priority_support",
  ]) {
    assert.ok(getMinimumPlanForCapability(capability))
  }

  const result = inspectWebsiteEntitlements("bronze", {
    sections: [],
    enabledCapabilities: ["whatsapp_integration", "availability_calendar"],
  })
  assert.equal(result.requiredPlan, "gold")
  assert.equal(result.violations.length, 2)
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
