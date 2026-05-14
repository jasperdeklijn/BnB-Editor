/**
 * Pricing Constants & Helpers
 * ============================
 * Centralized pricing data, plans, and utility functions.
 */

import { PricingPlan, PlanId, FeatureComparison } from "@/lib/types/pricing"

// ===== PRICING PLANS =====

export const PRICING_PLANS: Record<PlanId, PricingPlan> = {
  lite: {
    id: "lite",
    name: "Lite",
    description: "Perfect voor de startende B&B-eigenaar",
    monthlyPrice: 9,
    currency: "EUR",
    features: [
      "1 accommodatie",
      "Basissecties (hero, galerij, kamers, contact)",
      "Mobielvriendelijk ontwerp",
      "Contactformulier",
      "Gratis SSL-certificaat",
      "E-mailondersteuning",
    ],
    isAddon: false,
    isPopular: false,
    cta: "Begin met Lite",
  },

  growth: {
    id: "growth",
    name: "Growth",
    description: "Complete tools om je B&B te laten groeien",
    monthlyPrice: 29,
    currency: "EUR",
    features: [
      "Onbeperkte accommodaties",
      "Onbeperkte secties",
      "Aangepaste branding",
      "SEO-optimalisatietools",
      "Analytics-dashboard",
      "Prioriteitsondersteuning via e-mail",
      "Geavanceerde maatwerkopties",
      "Klaar voor boekingsintegratie",
    ],
    badge: "MEEST GEKOZEN",
    isAddon: false,
    isPopular: true,
    cta: "Upgrade naar Growth",
  },

  "booking-addon": {
    id: "booking-addon",
    name: "Booking Add-on",
    description: "Voeg boekingsbeheer toe aan elk abonnement",
    monthlyPrice: 19,
    currency: "EUR",
    features: [
      "Boekingsaanvragen van gasten",
      "Beschikbaarheidskalender",
      "Dashboard voor reserveringsbeheer",
      "Gastcommunicatie",
      "Geautomatiseerde bevestigingsmails",
    ],
    isAddon: true,
    isPopular: false,
    cta: "Toevoegen aan abonnement",
  },
}

// ===== FEATURE COMPARISON TABLE DATA =====

export const FEATURE_COMPARISON: FeatureComparison[] = [
  {
    feature: "Accommodaties",
    lite: "1",
    growth: "Onbeperkt",
    bookingAddon: "—",
  },
  {
    feature: "Secties",
    lite: "Basis (4)",
    growth: "Onbeperkt",
    bookingAddon: "—",
  },
  {
    feature: "Aangepaste branding",
    lite: false,
    growth: true,
    bookingAddon: "—",
  },
  {
    feature: "SEO-tools",
    lite: false,
    growth: true,
    bookingAddon: "—",
  },
  {
    feature: "Analytics",
    lite: false,
    growth: true,
    bookingAddon: "—",
  },
  {
    feature: "Boekingsbeheer",
    lite: false,
    growth: "Add-on",
    bookingAddon: true,
  },
  {
    feature: "Beschikbaarheidskalender",
    lite: false,
    growth: "Add-on",
    bookingAddon: true,
  },
  {
    feature: "Gastcommunicatie",
    lite: false,
    growth: "Add-on",
    bookingAddon: true,
  },
  {
    feature: "Ondersteuning",
    lite: "E-mail",
    growth: "Prioriteits-e-mail",
    bookingAddon: "—",
  },
]

// ===== FAQ DATA =====

export const PRICING_FAQ = [
  {
    question: "Kan ik upgraden of downgraden?",
    answer:
      "Ja, je kunt op elk moment van plan wisselen. Als je upgradet, worden de nieuwe functies direct beschikbaar. Als je downgradet, verlies je toegang tot premium functies op je volgende factureringsdatum.",
  },
  {
    question: "Wat gebeurt er aan het einde van mijn gratis proefperiode?",
    answer:
      "Na je gratis proefperiode wordt je automatisch in rekening gebracht voor je gekozen plan. Je kunt je abonnement op elk moment opzeggen.",
  },
  {
    question: "Hoe wordt het Add-on afgerekend?",
    answer:
      "Het Booking Add-on wordt samen met je standaardplan afgerekend op dezelfde factureringsdatum. Je kunt het op elk moment in- of uitschakelen.",
  },
  {
    question: "Kunnen kleine B&Bs het Lite plan gebruiken?",
    answer:
      "Absoluut! Het Lite plan is perfect voor kleine B&Bs die net beginnen. Je kunt later altijd upgraden naar Growth als je groeit.",
  },
]

// ===== HELPER FUNCTIONS =====

/**
 * Get a pricing plan by ID
 */
export function getPlanById(planId: PlanId): PricingPlan {
  return PRICING_PLANS[planId]
}

/**
 * Get all non-addon plans for display
 */
export function getMainPlans(): PricingPlan[] {
  return Object.values(PRICING_PLANS).filter((plan) => !plan.isAddon)
}

/**
 * Get all addon plans
 */
export function getAddonPlans(): PricingPlan[] {
  return Object.values(PRICING_PLANS).filter((plan) => plan.isAddon)
}

/**
 * Get features for a specific plan
 */
export function getFeaturesByPlan(planId: PlanId): string[] {
  return getPlanById(planId).features
}

/**
 * Get the "most popular" plan
 */
export function getPopularPlan(): PricingPlan {
  return PRICING_PLANS.growth
}

/**
 * Calculate total monthly cost for a plan with optional addons
 */
export function calculateMonthlyPrice(
  planId: PlanId,
  addons: { bookingAddon: boolean }
): number {
  let total = getPlanById(planId).monthlyPrice

  if (addons.bookingAddon) {
    total += getPlanById("booking-addon").monthlyPrice
  }

  return total
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: "EUR" = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Get human-readable plan name from ID
 */
export function getPlanDisplayName(planId: PlanId): string {
  return getPlanById(planId).name
}

/**
 * Check if plan is monthly (all plans are monthly-only for this SaaS)
 */
export function isBilledMonthly(planId: PlanId): boolean {
  return !getPlanById(planId).annualPrice
}

/**
 * Get all plans except a specific one
 */
export function getPlansExcept(planId: PlanId): PricingPlan[] {
  return getMainPlans().filter((plan) => plan.id !== planId)
}
