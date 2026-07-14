import type { Section, SectionType } from "@/lib/types"
import type { PlanId } from "@/lib/types/pricing"

export const ENTITLEMENT_PLAN_ORDER = ["bronze", "silver", "gold"] as const satisfies readonly PlanId[]

export type EntitlementCapability =
  | "contact_form"
  | "email_contact_requests"
  | "email_quote_requests"
  | "email_appointment_requests"
  | "whatsapp_integration"
  | "booking_system"
  | "availability_calendar"
  | "automatic_booking_confirmations"
  | "booking_management"
  | "priority_support"

export type EntitlementViolationCode =
  | "section.requires_plan"
  | "section.limit_exceeded"
  | "feature.requires_plan"

export interface EntitlementViolation {
  code: EntitlementViolationCode
  label: string
  currentPlan: PlanId
  requiredPlan: PlanId
  sectionId?: string
  sectionType?: SectionType
  capability?: EntitlementCapability
  actualCount?: number
  allowedCount?: number | null
}

export interface WebsiteEntitlementInput {
  sections: readonly Pick<Section, "id" | "type" | "data">[]
  enabledCapabilities?: readonly EntitlementCapability[]
}

export interface WebsiteEntitlementResult {
  allowed: boolean
  currentPlan: PlanId
  requiredPlan: PlanId
  violations: EntitlementViolation[]
}

const SECTION_MINIMUM_PLAN = {
  nav: "bronze",
  hero: "bronze",
  about: "bronze",
  services: "bronze",
  contact: "bronze",
  map: "bronze",
  footer: "bronze",
  request_form: "bronze",
  gallery: "silver",
  features: "silver",
  testimonials: "silver",
  faq: "silver",
  opening_hours: "silver",
  pricing: "silver",
  team: "silver",
  cta: "silver",
} as const satisfies Record<SectionType, PlanId>

export const SECTION_LIMIT_BY_PLAN = {
  bronze: 6,
  silver: 10,
  gold: null,
} as const satisfies Record<PlanId, number | null>

export const CAPABILITY_MINIMUM_PLAN = {
  contact_form: "bronze",
  email_contact_requests: "silver",
  email_quote_requests: "silver",
  email_appointment_requests: "silver",
  whatsapp_integration: "silver",
  booking_system: "gold",
  availability_calendar: "gold",
  automatic_booking_confirmations: "gold",
  booking_management: "gold",
  priority_support: "gold",
} as const satisfies Record<EntitlementCapability, PlanId>

const CAPABILITY_LABELS = {
  contact_form: "Contactformulier",
  email_contact_requests: "Contactaanvragen per e-mail",
  email_quote_requests: "Offerteaanvragen per e-mail",
  email_appointment_requests: "Afspraakaanvragen per e-mail",
  whatsapp_integration: "WhatsApp-integratie",
  booking_system: "Online boekingssysteem",
  availability_calendar: "Beschikbaarheidskalender",
  automatic_booking_confirmations: "Automatische boekingsbevestigingen",
  booking_management: "Boekingsbeheer",
  priority_support: "Priority support",
} as const satisfies Record<EntitlementCapability, string>

const SECTION_LABELS = {
  nav: "Navigatie",
  hero: "Hero",
  about: "Over ons",
  services: "Diensten",
  contact: "Contact",
  map: "Kaart",
  footer: "Footer",
  request_form: "Aanvraagformulier",
  gallery: "Galerij",
  features: "Kenmerken",
  testimonials: "Reviews",
  faq: "Veelgestelde vragen",
  opening_hours: "Openingstijden",
  pricing: "Prijzen",
  team: "Ons team",
  cta: "Call-to-action",
} as const satisfies Record<SectionType, string>

function planIndex(plan: PlanId): number {
  return ENTITLEMENT_PLAN_ORDER.indexOf(plan)
}

export function planMeetsRequirement(currentPlan: PlanId, requiredPlan: PlanId): boolean {
  return planIndex(currentPlan) >= planIndex(requiredPlan)
}

export function highestRequiredPlan(plans: readonly PlanId[]): PlanId {
  return plans.reduce<PlanId>(
    (highest, plan) => (planIndex(plan) > planIndex(highest) ? plan : highest),
    "bronze",
  )
}

export function getMinimumPlanForSection(sectionType: SectionType): PlanId {
  return SECTION_MINIMUM_PLAN[sectionType]
}

export function getMinimumPlanForCapability(capability: EntitlementCapability): PlanId {
  return CAPABILITY_MINIMUM_PLAN[capability]
}

export function getRequestSubmissionCapability(requestType: string): EntitlementCapability {
  if (requestType === "quote") return "email_quote_requests"
  if (requestType === "appointment") return "email_appointment_requests"
  if (requestType === "whatsapp") return "whatsapp_integration"
  if (requestType === "booking_request") return "booking_system"
  return "contact_form"
}

export function getRequestEmailCapability(requestType: string): EntitlementCapability | null {
  if (requestType === "contact") return "email_contact_requests"
  if (requestType === "quote") return "email_quote_requests"
  if (requestType === "appointment") return "email_appointment_requests"
  if (requestType === "booking_request") return "booking_system"
  return null
}

export function getSectionLimit(plan: PlanId): number | null {
  return SECTION_LIMIT_BY_PLAN[plan]
}

export function getSectionCapabilities(
  section: Pick<Section, "type" | "data">,
): EntitlementCapability[] {
  if (section.type === "contact") {
    return ["contact_form"]
  }

  if (section.type === "request_form") {
    const requestType = typeof section.data.requestType === "string" ? section.data.requestType : "contact"
    if (requestType === "whatsapp") return ["whatsapp_integration"]
    if (requestType === "quote") return ["email_quote_requests"]
    if (requestType === "appointment") return ["email_appointment_requests"]
    if (requestType === "booking_request") return ["booking_system"]
    return ["contact_form"]
  }

  if (section.type === "services" && section.data.bookingSpaceEnabled === true) {
    return ["booking_system"]
  }

  return []
}

export function inspectWebsiteEntitlements(
  currentPlan: PlanId,
  input: WebsiteEntitlementInput,
): WebsiteEntitlementResult {
  const violations: EntitlementViolation[] = []
  const requiredPlans: PlanId[] = ["bronze"]
  const sectionLimit = getSectionLimit(currentPlan)

  if (sectionLimit !== null && input.sections.length > sectionLimit) {
    const requiredPlan: PlanId = currentPlan === "bronze" && input.sections.length <= 10 ? "silver" : "gold"
    requiredPlans.push(requiredPlan)
    violations.push({
      code: "section.limit_exceeded",
      label: `Maximaal ${sectionLimit} secties in ${currentPlan}`,
      currentPlan,
      requiredPlan,
      actualCount: input.sections.length,
      allowedCount: sectionLimit,
    })
  }

  const capabilities = new Map<string, { capability: EntitlementCapability; section?: Pick<Section, "id" | "type"> }>()

  for (const section of input.sections) {
    const requiredPlan = getMinimumPlanForSection(section.type)
    requiredPlans.push(requiredPlan)

    if (!planMeetsRequirement(currentPlan, requiredPlan)) {
      violations.push({
        code: "section.requires_plan",
        label: SECTION_LABELS[section.type],
        currentPlan,
        requiredPlan,
        sectionId: section.id,
        sectionType: section.type,
      })
    }

    for (const capability of getSectionCapabilities(section)) {
      capabilities.set(`${section.id}:${capability}`, { capability, section })
    }
  }

  for (const capability of input.enabledCapabilities ?? []) {
    capabilities.set(`website:${capability}`, { capability })
  }

  for (const { capability, section } of capabilities.values()) {
    const requiredPlan = getMinimumPlanForCapability(capability)
    requiredPlans.push(requiredPlan)
    if (planMeetsRequirement(currentPlan, requiredPlan)) continue

    violations.push({
      code: "feature.requires_plan",
      label: CAPABILITY_LABELS[capability],
      currentPlan,
      requiredPlan,
      capability,
      sectionId: section?.id,
      sectionType: section?.type,
    })
  }

  return {
    allowed: violations.length === 0,
    currentPlan,
    requiredPlan: highestRequiredPlan(requiredPlans),
    violations,
  }
}
