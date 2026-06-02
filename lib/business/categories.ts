export type BusinessCategory =
  | "hairdresser"
  | "gardener"
  | "coach"
  | "restaurant"
  | "photographer"
  | "freelancer"
  | "construction"
  | "general_service"

export interface BusinessCategoryMeta {
  value: BusinessCategory
  label: string
  description: string
  exampleServices: string[]
}

export const BUSINESS_CATEGORIES: BusinessCategoryMeta[] = [
  {
    value: "hairdresser",
    label: "Kapper / Schoonheidsspecialist",
    description: "Kapsalon, schoonheidssalon, nagelstudio of barber",
    exampleServices: ["Knippen", "Verven", "Behandeling"],
  },
  {
    value: "gardener",
    label: "Hovenier / Groenvoorziening",
    description: "Tuinaanleg, onderhoud, bestrating en groenprojecten",
    exampleServices: ["Tuinaanleg", "Snoeiwerk", "Bestrating"],
  },
  {
    value: "coach",
    label: "Coach / Therapeut / Trainer",
    description: "Life coach, personal trainer, therapeut of adviseur",
    exampleServices: ["Kennismakingsgesprek", "Coachtraject", "Workshop"],
  },
  {
    value: "restaurant",
    label: "Restaurant / Cafe / Horeca",
    description: "Eetgelegenheid, cafe, catering of bezorgservice",
    exampleServices: ["Lunch", "Diner", "Catering"],
  },
  {
    value: "photographer",
    label: "Fotograaf / Videograaf",
    description: "Portret-, bruiloft-, product- of bedrijfsfotografie",
    exampleServices: ["Portretfotografie", "Bruiloftsfotografie", "Bedrijfsfoto's"],
  },
  {
    value: "freelancer",
    label: "Freelancer / Consultant / ZZP'er",
    description: "Designer, ontwikkelaar, tekstschrijver of adviseur",
    exampleServices: ["Adviesgesprek", "Project op maat", "Uurtarief"],
  },
  {
    value: "construction",
    label: "Aannemer / Vakman / Klus",
    description: "Bouwbedrijf, elektricien, loodgieter of schilder",
    exampleServices: ["Vrijblijvende offerte", "Renovatie", "Onderhoud"],
  },
  {
    value: "general_service",
    label: "Overige dienstverlening",
    description: "Schoonmaak, transport, kinderopvang of iets anders",
    exampleServices: ["Kennismakingsgesprek", "Standaard dienst", "Maatwerk"],
  },
]

export function getCategoryLabel(value: BusinessCategory | string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value
}
