export type BusinessCategory =
  | "bnb"
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
  offering: OfferingCopy
}

export interface OfferingCopy {
  singular: string
  plural: string
  title: string
  sectionTitle: string
  managerDescription: string
  addLabel: string
  newItemTitle: string
  unnamedItem: string
  itemNameLabel: string
  itemNamePlaceholder: string
  emptyTitle: string
  emptyDescription: string
  previewLabel: string
  manageLabel: string
  createLabel: string
}

const DEFAULT_OFFERING_COPY: OfferingCopy = {
  singular: "dienst",
  plural: "diensten",
  title: "Diensten",
  sectionTitle: "Onze diensten",
  managerDescription: "Beheer diensten, prijzen, duur en afbeeldingen die op uw website worden getoond.",
  addLabel: "Dienst toevoegen",
  newItemTitle: "Nieuwe dienst",
  unnamedItem: "Naamloze dienst",
  itemNameLabel: "Dienstnaam",
  itemNamePlaceholder: "Knipbeurt",
  emptyTitle: "Nog geen diensten",
  emptyDescription: "Klik op \"Dienst toevoegen\" om uw eerste dienst aan te maken",
  previewLabel: "Voorbeeld diensten",
  manageLabel: "Diensten beheren",
  createLabel: "Diensten aanmaken",
}

const BNB_OFFERING_COPY: OfferingCopy = {
  singular: "accommodatie",
  plural: "accommodaties",
  title: "Accommodaties",
  sectionTitle: "Onze accommodaties",
  managerDescription: "Beheer kamers, accommodaties, prijzen en afbeeldingen die op uw website worden getoond.",
  addLabel: "Accommodatie toevoegen",
  newItemTitle: "Nieuwe accommodatie",
  unnamedItem: "Naamloze accommodatie",
  itemNameLabel: "Naam accommodatie",
  itemNamePlaceholder: "Tweepersoonskamer",
  emptyTitle: "Nog geen accommodaties",
  emptyDescription: "Klik op \"Accommodatie toevoegen\" om uw eerste kamer of accommodatie aan te maken",
  previewLabel: "Voorbeeld accommodaties",
  manageLabel: "Accommodaties beheren",
  createLabel: "Accommodaties aanmaken",
}

export const BUSINESS_CATEGORIES: BusinessCategoryMeta[] = [
  {
    value: "bnb",
    label: "B&B / Accommodatie",
    description: "Bed & breakfast, vakantiewoning, gastenverblijf of klein hotel",
    exampleServices: ["Overnachting", "Ontbijt", "Arrangementen"],
    offering: BNB_OFFERING_COPY,
  },
  {
    value: "hairdresser",
    label: "Kapper / Schoonheidsspecialist",
    description: "Kapsalon, schoonheidssalon, nagelstudio of barber",
    exampleServices: ["Knippen", "Verven", "Behandeling"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "gardener",
    label: "Hovenier / Groenvoorziening",
    description: "Tuinaanleg, onderhoud, bestrating en groenprojecten",
    exampleServices: ["Tuinaanleg", "Snoeiwerk", "Bestrating"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "coach",
    label: "Coach / Therapeut / Trainer",
    description: "Life coach, personal trainer, therapeut of adviseur",
    exampleServices: ["Kennismakingsgesprek", "Coachtraject", "Workshop"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "restaurant",
    label: "Restaurant / Cafe / Horeca",
    description: "Eetgelegenheid, cafe, catering of bezorgservice",
    exampleServices: ["Lunch", "Diner", "Catering"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "photographer",
    label: "Fotograaf / Videograaf",
    description: "Portret-, bruiloft-, product- of bedrijfsfotografie",
    exampleServices: ["Portretfotografie", "Bruiloftsfotografie", "Bedrijfsfoto's"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "freelancer",
    label: "Freelancer / Consultant / ZZP'er",
    description: "Designer, ontwikkelaar, tekstschrijver of adviseur",
    exampleServices: ["Adviesgesprek", "Project op maat", "Uurtarief"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "construction",
    label: "Aannemer / Vakman / Klus",
    description: "Bouwbedrijf, elektricien, loodgieter of schilder",
    exampleServices: ["Vrijblijvende offerte", "Renovatie", "Onderhoud"],
    offering: DEFAULT_OFFERING_COPY,
  },
  {
    value: "general_service",
    label: "Overige dienstverlening",
    description: "Schoonmaak, transport, kinderopvang of iets anders",
    exampleServices: ["Kennismakingsgesprek", "Standaard dienst", "Maatwerk"],
    offering: DEFAULT_OFFERING_COPY,
  },
]

export function getCategoryLabel(value: BusinessCategory | string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function getOfferingCopy(category?: BusinessCategory | string | null): OfferingCopy {
  return BUSINESS_CATEGORIES.find((c) => c.value === category)?.offering ?? DEFAULT_OFFERING_COPY
}
