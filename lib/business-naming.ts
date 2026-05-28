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
    label: "Hero",
    description: "Hoofdsectie met intro en actieknop",
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
  rooms: {
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
  amenities: {
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
