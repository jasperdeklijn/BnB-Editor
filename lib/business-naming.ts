import type { SectionType } from "@/lib/types"

export const DEFAULT_SITE_TITLE = "Mijn website"
export const DEFAULT_BUSINESS_NAME = "Mijn bedrijf"
export const DEFAULT_BUSINESS_EMAIL = "info@mijnbedrijf.nl"

export const SECTION_COPY: Record<
  SectionType,
  { label: string; description: string; defaultTitle?: string }
> = {
  nav: {
    label: "Navigatie",
    description: "Bovenste navigatiebalk",
  },
  hero: {
    label: "Intro bovenaan",
    description: "Eerste blok met titel, tekst en knop",
    defaultTitle: "Welkom bij ons bedrijf",
  },
  about: {
    label: "Over ons",
    description: "Vertel het verhaal van je bedrijf",
    defaultTitle: "Over ons",
  },
  services: {
    label: "Diensten",
    description: "Toon diensten of aanbod",
    defaultTitle: "Onze diensten",
  },
  gallery: {
    label: "Galerij",
    description: "Fotogalerij of portfolio",
    defaultTitle: "Galerij",
  },
  features: {
    label: "Kenmerken",
    description: "Pluspunten en voordelen",
    defaultTitle: "Waarom klanten voor ons kiezen",
  },
  contact: {
    label: "Contact",
    description: "Contactformulier en gegevens",
    defaultTitle: "Neem contact op",
  },
  footer: {
    label: "Voettekst",
    description: "Onderste voettekst",
  },
  testimonials: {
    label: "Recensies",
    description: "Klantbeoordelingen en ervaringen",
    defaultTitle: "Wat klanten zeggen",
  },
  faq: {
    label: "Veelgestelde vragen",
    description: "Antwoorden op veelgestelde vragen",
    defaultTitle: "Veelgestelde vragen",
  },
  opening_hours: {
    label: "Openingstijden",
    description: "Wanneer je bereikbaar bent",
    defaultTitle: "Openingstijden",
  },
  pricing: {
    label: "Prijzen",
    description: "Tarieven en pakketten",
    defaultTitle: "Onze tarieven",
  },
  team: {
    label: "Ons team",
    description: "Stel je teamleden voor",
    defaultTitle: "Maak kennis met ons team",
  },
  map: {
    label: "Locatie",
    description: "Kaart en locatiegegevens",
    defaultTitle: "Onze locatie",
  },
  cta: {
    label: "Actieknop",
    description: "Uitnodiging tot actie",
    defaultTitle: "Klaar om te beginnen?",
  },
  request_form: {
    label: "Aanvraagformulier",
    description: "Formulier voor contact, offerte of afspraak",
    defaultTitle: "Stuur een aanvraag",
  },
}

export const DEFAULT_FEATURES = [
  "Persoonlijke service",
  "Heldere afspraken",
  "Vakmanschap",
  "Snelle reactie",
]

export const DEFAULT_GALLERY_IMAGES = Array.from(
  { length: 6 },
  (_, index) => `/placeholder.svg?height=400&width=400&query=small+business+service+${index + 1}`,
)
