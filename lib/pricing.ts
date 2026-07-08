/**
 * Pricing constants and helpers.
 */

import { FeatureComparison, PlanId, PricingPlan } from "@/lib/types/pricing"

export const PLAN_ORDER: PlanId[] = ["bronze", "silver", "gold"]

export const PRICING_PLANS: Record<PlanId, PricingPlan> = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    description: "Alles wat u nodig heeft om uw bedrijf professioneel online te zetten.",
    monthlyPrice: 7.95,
    currency: "EUR",
    features: [
      "Responsive website",
      "Eigen domein met SSL",
      "SEO-vriendelijke pagina's",
      "Mobiel geoptimaliseerd",
      "Contactformulier",
      "Tot 6 secties",
    ],
    isAddon: false,
    isPopular: false,
    cta: "Start met Bronze",
  },
  silver: {
    id: "silver",
    name: "Silver",
    description: "Voor bedrijven die meer aanvragen en contactmomenten uit hun website willen halen.",
    monthlyPrice: 14.95,
    currency: "EUR",
    features: [
      "Alles uit Bronze",
      "Tot 10 secties",
      "Galerij, reviews, FAQ en openingstijden",
      "Prijs- en CTA-secties",
      "Aanvragen per e-mail",
      "WhatsApp contactknop",
    ],
    badge: "MEEST GEKOZEN",
    isAddon: false,
    isPopular: true,
    cta: "Kies Silver",
  },
  gold: {
    id: "gold",
    name: "Gold",
    description: "Voor bedrijven die afspraken, beschikbaarheid en boekingen online willen beheren.",
    monthlyPrice: 24.95,
    currency: "EUR",
    features: [
      "Alles uit Silver",
      "Onbeperkte secties",
      "Online afspraken boeken",
      "Boekingskalender",
      "Beschikbaarheid beheren",
      "Automatische bevestigingen",
      "Boekingsdashboard",
      "Priority support",
    ],
    isAddon: false,
    isPopular: false,
    cta: "Kies Gold",
  },
}

export const FEATURE_COMPARISON: FeatureComparison[] = [
  {
    feature: "Professionele website",
    bronze: true,
    silver: true,
    gold: true,
  },
  {
    feature: "Mobiel responsive",
    bronze: true,
    silver: true,
    gold: true,
  },
  {
    feature: "Eigen domein en SSL",
    bronze: true,
    silver: true,
    gold: true,
  },
  {
    feature: "Maximaal aantal secties",
    bronze: "6",
    silver: "10",
    gold: "Onbeperkt",
  },
  {
    feature: "Galerij, reviews, FAQ en openingstijden",
    bronze: false,
    silver: true,
    gold: true,
  },
  {
    feature: "Prijs- en CTA-secties",
    bronze: false,
    silver: true,
    gold: true,
  },
  {
    feature: "Contactformulier",
    bronze: true,
    silver: true,
    gold: true,
  },
  {
    feature: "Aanvragen per e-mail",
    bronze: false,
    silver: true,
    gold: true,
  },
  {
    feature: "WhatsApp integratie",
    bronze: false,
    silver: true,
    gold: true,
  },
  {
    feature: "Online boekingssysteem",
    bronze: false,
    silver: false,
    gold: true,
  },
  {
    feature: "Beschikbaarheidskalender",
    bronze: false,
    silver: false,
    gold: true,
  },
  {
    feature: "Automatische boekingsbevestigingen",
    bronze: false,
    silver: false,
    gold: true,
  },
  {
    feature: "Boekingsbeheer",
    bronze: false,
    silver: false,
    gold: true,
  },
  {
    feature: "Priority support",
    bronze: false,
    silver: false,
    gold: true,
  },
]

export const PRICING_FAQ = [
  {
    question: "Kan ik later van abonnement wisselen?",
    answer:
      "Ja. U kunt starten met Bronze en later overstappen naar Silver of Gold wanneer uw website meer functies nodig heeft.",
  },
  {
    question: "Voor wie is Silver bedoeld?",
    answer:
      "Silver is bedoeld voor bedrijven die via hun website meer aanvragen willen ontvangen, bijvoorbeeld via e-mail, offerteaanvragen, afspraakaanvragen en WhatsApp.",
  },
  {
    question: "Wanneer heb ik Gold nodig?",
    answer:
      "Gold past bij bedrijven die werken op afspraak, zoals salons, B&B's, coaches, therapeuten, consultants en andere dienstverleners.",
  },
  {
    question: "Zijn domein en SSL inbegrepen?",
    answer:
      "Ja. Elk abonnement ondersteunt een eigen domein en SSL, zodat uw website professioneel en veilig online staat.",
  },
]

export function getPlanById(planId: PlanId): PricingPlan {
  return PRICING_PLANS[planId]
}

export function getMainPlans(): PricingPlan[] {
  return PLAN_ORDER.map((planId) => PRICING_PLANS[planId])
}

export function getAddonPlans(): PricingPlan[] {
  return []
}

export function getFeaturesByPlan(planId: PlanId): string[] {
  return getPlanById(planId).features
}

export function getPopularPlan(): PricingPlan {
  return PRICING_PLANS.silver
}

export function calculateMonthlyPrice(
  planId: PlanId,
  _addons: { bookingAddon: boolean }
): number {
  return getPlanById(planId).monthlyPrice
}

export function formatPrice(amount: number, currency: "EUR" = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getPlanDisplayName(planId: PlanId): string {
  return getPlanById(planId).name
}

export function isBilledMonthly(planId: PlanId): boolean {
  return !getPlanById(planId).annualPrice
}

export function getPlansExcept(planId: PlanId): PricingPlan[] {
  return getMainPlans().filter((plan) => plan.id !== planId)
}
