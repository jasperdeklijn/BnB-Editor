/**
 * Pricing constants and helpers.
 */

import { FeatureComparison, PlanId, PricingPlan } from "@/lib/types/pricing"

export const PLAN_ORDER: PlanId[] = ["bronze", "silver", "gold"]
export const BOOKING_ADDON_MONTHLY_PRICE = 14.95
export const BOOKING_ADDON_NAME = "Booking & Facturatie"
export const BOOKING_ADDON_FEATURES = [
  "Online boekingen",
  "Beschikbaarheid",
  "Boekingsbeheer",
  "Automatische bevestigingen",
  "Factuur vanuit boeking",
  "PDF-facturen",
  "Klantgegevens",
  "Factuurhistorie",
]
export const MULTILINGUAL_ADDON_MONTHLY_PRICE = 2.99

export const PRICING_PLANS: Record<PlanId, PricingPlan> = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    description: "Voor ondernemers die vooral professioneel online willen staan.",
    monthlyPrice: 7.95,
    currency: "EUR",
    features: [
      "Website",
      "Eigen domein",
      "SSL",
      "SEO-basis",
      "Contact",
      "Maximaal 6 secties",
    ],
    isAddon: false,
    isPopular: false,
    cta: "Start met Bronze",
  },
  silver: {
    id: "silver",
    name: "Silver",
    description: "Voor ondernemers die meer uit hun website willen halen.",
    monthlyPrice: 14.95,
    currency: "EUR",
    features: [
      "Alles uit Bronze",
      "Maximaal 10 secties",
      "Galerie",
      "Reviews",
      "FAQ",
      "Openingstijden",
      "Prijssecties",
      "CTA",
      "Aanvragen",
    ],
    badge: "MEEST GEKOZEN",
    isAddon: false,
    isPopular: true,
    cta: "Kies Silver",
  },
  gold: {
    id: "gold",
    name: "Gold",
    description: "Voor ondernemers die een uitgebreide website en extra ondersteuning willen.",
    monthlyPrice: 24.95,
    currency: "EUR",
    features: [
      "Alles uit Silver",
      "Onbeperkte secties",
      "Uitgebreide functies",
      "Diensten beheren",
      "Meertaligheid",
      "Priority support",
    ],
    isAddon: false,
    isPopular: false,
    cta: "Kies Gold",
  },
}

export const FEATURE_COMPARISON: FeatureComparison[] = [
  {
    feature: "SEO-basis",
    bronze: true,
    silver: true,
    gold: true,
  },
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
    feature: "Galerie, reviews, FAQ en openingstijden",
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
    feature: "Diensten beheren",
    bronze: "Via Booking & Facturatie",
    silver: "Via Booking & Facturatie",
    gold: true,
  },
  {
    feature: "Online boekingssysteem",
    bronze: "Booking & Facturatie",
    silver: "Booking & Facturatie",
    gold: "Booking & Facturatie",
  },
  {
    feature: "Beschikbaarheidskalender",
    bronze: "Booking & Facturatie",
    silver: "Booking & Facturatie",
    gold: "Booking & Facturatie",
  },
  {
    feature: "Automatische boekingsbevestigingen",
    bronze: "Booking & Facturatie",
    silver: "Booking & Facturatie",
    gold: "Booking & Facturatie",
  },
  {
    feature: "Boekingsbeheer",
    bronze: "Booking & Facturatie",
    silver: "Booking & Facturatie",
    gold: "Booking & Facturatie",
  },
  {
    feature: "Factuur vanuit boeking en PDF-facturen",
    bronze: BOOKING_ADDON_NAME,
    silver: BOOKING_ADDON_NAME,
    gold: BOOKING_ADDON_NAME,
  },
  {
    feature: "Klantgegevens en factuurhistorie",
    bronze: BOOKING_ADDON_NAME,
    silver: BOOKING_ADDON_NAME,
    gold: BOOKING_ADDON_NAME,
  },
  {
    feature: "Meertalige website",
    bronze: "Add-on € 2,99/mnd",
    silver: "Add-on € 2,99/mnd",
    gold: "Inbegrepen",
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
    question: "Wat zit er in Booking & Facturatie?",
    answer:
      `${BOOKING_ADDON_NAME} kost ${formatPrice(BOOKING_ADDON_MONTHLY_PRICE)} per maand exclusief btw en is beschikbaar bij Bronze, Silver en Gold. De add-on bevat online boekingen, beschikbaarheid, boekingsbeheer, automatische bevestigingen, facturen vanuit boekingen, PDF-facturen, klantgegevens en factuurhistorie. Ook het beheer van de boekbare diensten is inbegrepen.`,
  },
  {
    question: "Kan ik een meertalige website maken?",
    answer:
      "Ja. Meertaligheid is inbegrepen bij Gold. Bij Bronze en Silver kunt u het talenpakket voor € 2,99 per maand exclusief btw toevoegen.",
  },
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
      "Gold biedt onbeperkte secties, uitgebreide functies, dienstenbeheer, meertaligheid en priority support. Online boeken en facturen vanuit boekingen zijn bij elk abonnement beschikbaar met Booking & Facturatie.",
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
  addons: { bookingAddon: boolean; multilingualAddon: boolean }
): number {
  const multilingualAddonPrice = planId !== "gold" && addons.multilingualAddon
    ? MULTILINGUAL_ADDON_MONTHLY_PRICE
    : 0
  const bookingAddonPrice = addons.bookingAddon ? BOOKING_ADDON_MONTHLY_PRICE : 0
  return Math.round((getPlanById(planId).monthlyPrice + multilingualAddonPrice + bookingAddonPrice) * 100) / 100
}

export function formatPrice(amount: number, currency: "EUR" = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
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
