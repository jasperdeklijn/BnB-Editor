/**
 * Pricing constants and helpers.
 */

import { FeatureComparison, PlanId, PricingPlan } from "@/lib/types/pricing"
import { PUBLISHED_PAGE_LIMIT_BY_PLAN } from "@/lib/entitlements"

export const PLAN_ORDER: PlanId[] = ["bronze", "silver", "gold"]
export const PRICING_DISPLAY_ORDER: PlanId[] = ["bronze", "gold", "silver"]
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

export function getPublishedPageLabel(planId: PlanId) {
  const limit = PUBLISHED_PAGE_LIMIT_BY_PLAN[planId]
  return limit === null ? "Onbeperkte pagina's (fair-use)" : `${limit} gepubliceerde pagina's`
}

export const PRICING_PLANS: Record<PlanId, PricingPlan> = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    description: "Ga online met je bedrijf.",
    monthlyPrice: 7.95,
    currency: "EUR",
    features: [getPublishedPageLabel("bronze"), "Alle websitebouwfuncties en hosting", "Eigen domein en SSL", "SEO-basis en social links", "Contactformulier", "Bezoekers en paginaweergaven", "Onbeperkte secties"],
    isAddon: false,
    isPopular: false,
    cta: "Start met Bronze",
  },
  silver: {
    id: "silver",
    name: "Silver",
    description: "Laat je bedrijf groeien.",
    monthlyPrice: 14.95,
    currency: "EUR",
    features: ["Alles uit Bronze", getPublishedPageLabel("silver"), "Onbeperkte secties", "Aanvragen beheren", "Uitgebreide pagina-SEO en GA4", "Populaire pagina's, bronnen en apparaten", "Trends en 30/90 dagen"],
    isAddon: false,
    isPopular: false,
    cta: "Kies Silver",
  },
  gold: {
    id: "gold",
    name: "Gold",
    description: "Begrijp je bezoekers en verbeter je website.",
    monthlyPrice: 24.95,
    currency: "EUR",
    features: ["Alles uit Silver", getPublishedPageLabel("gold"), "Recensies verzamelen en beheren", "Diensten beheren", "Meertaligheid", "Conversies en maandrapport", "Tot 12 maanden historie"],
    badge: "AANBEVOLEN",
    isAddon: false,
    isPopular: true,
    cta: "Kies Gold",
  },
}

export const FEATURE_COMPARISON: FeatureComparison[] = [
  { feature: "Websitepagina's", bronze: `${PUBLISHED_PAGE_LIMIT_BY_PLAN.bronze} gepubliceerd`, silver: `${PUBLISHED_PAGE_LIMIT_BY_PLAN.silver} gepubliceerd`, gold: "Onbeperkt (fair-use)" },
  { feature: "Bezoekers en paginaweergaven", bronze: true, silver: true, gold: true },
  { feature: "Bronnen, apparaten en trends", bronze: false, silver: true, gold: true },
  { feature: "Conversies en maandrapport", bronze: false, silver: false, gold: true },
  { feature: "Uitgebreide pagina-SEO en GA4", bronze: false, silver: true, gold: true },
  { feature: "Recensies verzamelen en beheren", bronze: false, silver: false, gold: true },
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
    bronze: "Onbeperkt",
    silver: "Onbeperkt",
    gold: "Onbeperkt",
  },
  {
    feature: "Galerie, Google-recensielink, FAQ en openingstijden",
    bronze: true,
    silver: true,
    gold: true,
  },
  {
    feature: "Prijs- en CTA-secties",
    bronze: true,
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
    bronze: "Optionele add-on",
    silver: "Optionele add-on",
    gold: "Inbegrepen",
  },

]

export const PRICING_FAQ = [
  { question: "Wanneer worden de officiële tarieven bekend?", answer: "FlexPagina is nog in de testfase. De officiële tarieven worden later bekendgemaakt; daarom zijn de prijzen voorlopig vervaagd. Je kunt de pakketten en hun mogelijkheden alvast vergelijken." },
  { question: "Wat betekent fair-use bij Gold?", answer: "Gold heeft geen vaste paginalimiet. Bestaande technische upload- en importgrenzen blijven gelden. Statistieken verwerken maximaal 20 gebeurtenissen per aanvraag, 120 aanvragen per browsersessie per minuut en 1.000 per website per minuut; pieken kunnen worden overgeslagen. Je gepubliceerde pagina's blijven bereikbaar." },
  {
    question: "Welk abonnement heb ik nodig voor meerdere pagina's?",
    answer: `Bronze: ${getPublishedPageLabel("bronze")}. Silver: ${getPublishedPageLabel("silver")}. Gold: ${getPublishedPageLabel("gold")}. Conceptpagina's, ontwerpen en secties tellen niet mee. Add-ons veranderen de paginalimiet niet.`,
  },
  {
    question: "Wat zit er in Booking & Facturatie?",
    answer:
      `${BOOKING_ADDON_NAME} is beschikbaar bij Bronze, Silver en Gold. De officiële tarieven worden na de testfase bekendgemaakt. De add-on bevat online boekingen, beschikbaarheid, boekingsbeheer, automatische bevestigingen, facturen vanuit boekingen, PDF-facturen, klantgegevens en factuurhistorie. Ook het beheer van de boekbare diensten is inbegrepen.`,
  },
  {
    question: "Kan ik een meertalige website maken?",
    answer:
      "Ja. Meertaligheid is inbegrepen bij Gold. Bij Bronze en Silver kunt u het talenpakket toevoegen. Het officiële tarief wordt na de testfase bekendgemaakt.",
  },
  {
    question: "Kan ik later van abonnement wisselen?",
    answer:
      "In het beoogde betaalde aanbod kunt u van pakket veranderen wanneer uw website meer functies nodig heeft. Tijdens de tijdelijke testtoegang zijn betaalde abonnementen en pakketwijzigingen nog niet beschikbaar.",
  },
  {
    question: "Voor wie is Silver bedoeld?",
    answer:
      "Silver is bedoeld voor bedrijven die via hun website meer aanvragen willen ontvangen, bijvoorbeeld via e-mail, offerteaanvragen, afspraakaanvragen en WhatsApp.",
  },
  {
    question: "Wanneer heb ik Gold nodig?",
    answer:
      "Gold biedt onbeperkte pagina's (fair-use), geavanceerde statistieken, recensiebeheer, dienstenbeheer en meertaligheid. Online boeken en facturen vanuit boekingen zijn bij elk abonnement beschikbaar met Booking & Facturatie.",
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
  return PRICING_DISPLAY_ORDER.map((planId) => PRICING_PLANS[planId])
}

export function getAddonPlans(): PricingPlan[] {
  return []
}

export function getFeaturesByPlan(planId: PlanId): string[] {
  return getPlanById(planId).features
}

export function getPopularPlan(): PricingPlan {
  return PRICING_PLANS.gold
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
