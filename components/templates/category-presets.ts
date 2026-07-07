import type { SectionType } from "@/lib/types"
import type { BusinessCategory } from "@/lib/business/categories"

export interface ServiceItem {
  title: string
  description: string
  price?: string
  duration?: string
}

export interface TemplatePreset {
  id: string
  category: BusinessCategory
  name: string
  description: string
  businessDefaults: {
    name: string
    tagline: string
    description: string
    phone?: string
    email?: string
  }
  services: ServiceItem[]
  sections: Array<{
    type: SectionType
    position: number
    data?: Record<string, unknown>
  }>
}

const BNB_TEMPLATE: TemplatePreset = {
  id: "bnb-hospitality",
  category: "bnb",
  name: "B&B / Accommodatie",
  description: "Gastvrij sjabloon voor kamers, ontbijt en reserveringsaanvragen",
  businessDefaults: {
    name: "B&B De Tuinkamer",
    tagline: "Rustig overnachten met persoonlijke aandacht",
    description: "Een sfeervolle bed & breakfast met comfortabele kamers, lokaal ontbijt en tips voor de omgeving.",
    phone: "+31 6 12345678",
    email: "info@bedandbreakfast.nl",
  },
  services: [
    { title: "Tweepersoonskamer", description: "Comfortabele kamer inclusief ontbijt", price: "Vanaf EUR 95 per nacht" },
    { title: "Familiekamer", description: "Ruime kamer voor gezinnen of kleine groepen", price: "Vanaf EUR 140 per nacht" },
    { title: "Ontbijt", description: "Vers ontbijt met lokale producten", price: "Inbegrepen" },
    { title: "Weekendarrangement", description: "Twee nachten met ontbijt en late check-out", price: "Vanaf EUR 210" },
    { title: "Fietsverhuur", description: "Ontdek de omgeving per fiets", price: "EUR 15 per dag" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Welkom bij onze B&B", subtitle: "Rustig overnachten in een sfeervolle omgeving" } },
    { type: "gallery", position: 2 },
    { type: "about", position: 3 },
    { type: "services", position: 4, data: { title: "Onze accommodaties" } },
    { type: "opening_hours", position: 5 },
    { type: "testimonials", position: 6 },
    { type: "request_form", position: 7, data: { requestType: "booking" } },
    { type: "map", position: 8 },
    { type: "footer", position: 9 },
  ],
}

const HAIRDRESSER_TEMPLATE: TemplatePreset = {
  id: "hairdresser-luxury",
  category: "hairdresser",
  name: "Kapperszaak / Schoonheidssalon",
  description: "Professioneel sjabloon voor kappersservices en schoonheid",
  businessDefaults: {
    name: "Uw Kapperszaak",
    tagline: "Professionele service, persoonlijke aandacht",
    description: "Wij bieden professionele kapperservices en schoonheidsbehandelingen in een gezellige omgeving.",
    phone: "+31 6 12345678",
    email: "info@kappersaak.nl",
  },
  services: [
    { title: "Heren Knippen", description: "Klassieke kapperservice", price: "€ 25" },
    { title: "Dames Knippen", description: "Professionele dameskap", price: "€ 35" },
    { title: "Haar Verven", description: "Permanent kleuren of balayage", price: "Vanaf € 50" },
    { title: "Behandeling", description: "Haarmasker of verzorging", price: "€ 30" },
    { title: "Styling", description: "Speciaal kapsel voor evenementen", price: "€ 45" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Welkom in onze kapperszaak", subtitle: "Professionele service met persoonlijke aandacht" } },
    { type: "services", position: 2 },
    { type: "gallery", position: 3 },
    { type: "testimonials", position: 4 },
    { type: "opening_hours", position: 5 },
    { type: "contact", position: 6 },
    { type: "footer", position: 7 },
  ],
}

const GARDENER_TEMPLATE: TemplatePreset = {
  id: "gardener-nature",
  category: "gardener",
  name: "Hovenier / Tuinaanleg",
  description: "Modern ontwerp voor tuinontwerp en onderhoud",
  businessDefaults: {
    name: "Tuinontwerp & Onderhoud",
    tagline: "Jouw groene droomtuin wordt werkelijkheid",
    description: "Wij verzorgen professionele tuinaanleg, -onderhoud en landschapsprojecten voor particulieren en bedrijven.",
    phone: "+31 6 12345678",
    email: "info@tuinonderhoud.nl",
  },
  services: [
    { title: "Tuinaanleg", description: "Volledige tuinontwerp en aanleg", price: "Vanaf € 1.500" },
    { title: "Onderhoud", description: "Regelmatig tuinonderhoud", price: "€ 75/uur" },
    { title: "Snoeiwerk", description: "Professioneel snoeien van bomen en struiken", price: "€ 60/uur" },
    { title: "Bestrating", description: "Terrassen en paden", price: "Offerte op maat" },
    { title: "Boomverzorging", description: "Professionele boomkap en verzorging", price: "€ 85/uur" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Jouw perfecte tuin", subtitle: "Van ontwerp tot onderhoud" } },
    { type: "gallery", position: 2 },
    { type: "about", position: 3 },
    { type: "services", position: 4 },
    { type: "testimonials", position: 5 },
    { type: "request_form", position: 6, data: { requestType: "quote" } },
    { type: "map", position: 7 },
    { type: "footer", position: 8 },
  ],
}

const COACH_TEMPLATE: TemplatePreset = {
  id: "coach-wellness",
  category: "coach",
  name: "Coach / Therapeut / Trainer",
  description: "Vertrouwensvolle layout voor coachingservices",
  businessDefaults: {
    name: "Coaching & Welness",
    tagline: "Jouw persoonlijke groei is mijn missie",
    description: "Ik ondersteun je op je weg naar meer welzijn, geluk en succes met persoonlijke coaching en advies.",
    phone: "+31 6 12345678",
    email: "info@coaching.nl",
  },
  services: [
    { title: "Kennismakingsgesprek", description: "Gratis intake gesprek", price: "Gratis" },
    { title: "Eenmalige sessie", description: "Eenmalig coachingsgesprek", price: "€ 75" },
    { title: "Coachtraject", description: "6 sessies coachingstraject", price: "€ 400" },
    { title: "Workshop", description: "Groepsworkshop", price: "€ 35/persoon" },
    { title: "Online coaching", description: "Coaching per videoverbinding", price: "€ 65" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Welkom", subtitle: "Laten we samen aan je doelen werken" } },
    { type: "about", position: 2 },
    { type: "services", position: 3 },
    { type: "testimonials", position: 4 },
    { type: "faq", position: 5 },
    { type: "request_form", position: 6, data: { requestType: "appointment" } },
    { type: "footer", position: 7 },
  ],
}

const RESTAURANT_TEMPLATE: TemplatePreset = {
  id: "restaurant-dining",
  category: "restaurant",
  name: "Restaurant / Café / Horeca",
  description: "Aantrekkelijk design voor eetgelegenheden",
  businessDefaults: {
    name: "Restaurant & Café",
    tagline: "Heerlijk eten in gezellig gezelschap",
    description: "Kom genieten van heerlijke gerechten in onze sfeervolle restaurant. Wij serveren verse, lokale ingrediënten.",
    phone: "+31 6 12345678",
    email: "reservering@restaurant.nl",
  },
  services: [
    { title: "Lunch Menu", description: "Keuze uit diverse gerechten", price: "€ 15-25" },
    { title: "Diner à la carte", description: "Uitgebreide dinermenu", price: "€ 20-35" },
    { title: "Dagschotel", description: "Speciale dagschotel", price: "€ 12" },
    { title: "Catering", description: "Catering voor evenementen", price: "Op aanvraag" },
    { title: "Reservering", description: "Tafel reserveren", price: "Gratis" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Restaurant XYZ", subtitle: "Heerlijk eten in een sfeervolle omgeving" } },
    { type: "gallery", position: 2 },
    { type: "opening_hours", position: 3 },
    { type: "services", position: 4 },
    { type: "testimonials", position: 5 },
    { type: "map", position: 6 },
    { type: "contact", position: 7 },
    { type: "footer", position: 8 },
  ],
}

const PHOTOGRAPHER_TEMPLATE: TemplatePreset = {
  id: "photographer-portfolio",
  category: "photographer",
  name: "Fotograaf / Videograaf",
  description: "Visueel aantrekkelijk voor fotografen",
  businessDefaults: {
    name: "Fotografie Studio",
    tagline: "Mooie momenten vastgelegd",
    description: "Professionele fotografie voor bruiloften, portretfoto's, product- en bedrijfsfotografie.",
    phone: "+31 6 12345678",
    email: "info@fotografie.nl",
  },
  services: [
    { title: "Portretfotografie", description: "Professionele portretfoto's", price: "€ 150" },
    { title: "Bruiloftsfotografie", description: "Volledige bruiloftsfotografie", price: "Vanaf € 1.200" },
    { title: "Product fotografie", description: "Professionele productfoto's", price: "€ 60/uur" },
    { title: "Bedrijfsfoto's", description: "Fotoshoot bedrijfspanden", price: "€ 75/uur" },
    { title: "Video dronewerk", description: "Drone fotografie en video", price: "€ 200/uur" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Fotografie", subtitle: "Jouw mooiste momenten vastgelegd" } },
    { type: "gallery", position: 2 },
    { type: "about", position: 3 },
    { type: "services", position: 4 },
    { type: "testimonials", position: 5 },
    { type: "request_form", position: 6, data: { requestType: "quote" } },
    { type: "footer", position: 7 },
  ],
}

const FREELANCER_TEMPLATE: TemplatePreset = {
  id: "freelancer-professional",
  category: "freelancer",
  name: "Freelancer / Consultant",
  description: "Professioneel design voor freelancers en consultants",
  businessDefaults: {
    name: "Mijn Consultancy",
    tagline: "Expert advies op maat",
    description: "Ik bied gespecialiseerde advies en ondersteuning voor bedrijven die willen groeien en innoveren.",
    phone: "+31 6 12345678",
    email: "contact@consultant.nl",
  },
  services: [
    { title: "Adviesgesprek", description: "Eerste kennismakingsgesprek", price: "Gratis" },
    { title: "Projectwerk", description: "Opdracht op uurbasis of vast bedrag", price: "€ 75/uur" },
    { title: "Retainer", description: "Maandelijks advies arrangement", price: "€ 1.500/maand" },
    { title: "Training", description: "In-house training en workshops", price: "€ 850/dag" },
    { title: "Analyse & Rapport", description: "Grondige bedrijfsanalyse", price: "€ 2.500" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Consultancy", subtitle: "Professioneel advies voor groei" } },
    { type: "about", position: 2 },
    { type: "services", position: 3 },
    { type: "features", position: 4 },
    { type: "testimonials", position: 5 },
    { type: "faq", position: 6 },
    { type: "cta", position: 7, data: { title: "Klaar voor samenwerking?" } },
    { type: "contact", position: 8 },
    { type: "footer", position: 9 },
  ],
}

const CONSTRUCTION_TEMPLATE: TemplatePreset = {
  id: "construction-build",
  category: "construction",
  name: "Aannemer / Vakman",
  description: "Solide design voor bouw- en renovatiewerken",
  businessDefaults: {
    name: "Bouwbedrijf XYZ",
    tagline: "Vakmanschap dat je kunt vertrouwen",
    description: "Wij voeren renovatie-, bouw- en renovatiewerken uit met professionele aandacht en kwaliteit.",
    phone: "+31 6 12345678",
    email: "info@bouwbedrijf.nl",
  },
  services: [
    { title: "Vrijblijvende offerte", description: "Kosteloos inspectie en advies", price: "Gratis" },
    { title: "Renovatie", description: "Volledige huis- of bedrijfsrenovatie", price: "Offerte op maat" },
    { title: "Onderhoud", description: "Preventief onderhoud en reparaties", price: "€ 65/uur" },
    { title: "Nieuwbouw", description: "Nieuwbouwprojecten", price: "Offerte op maat" },
    { title: "Aanbouw", description: "Aanbouw of uitbreiding", price: "Offerte op maat" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Bouwbedrijf", subtitle: "Kwaliteit en betrouwbaarheid" } },
    { type: "gallery", position: 2 },
    { type: "about", position: 3 },
    { type: "services", position: 4 },
    { type: "features", position: 5 },
    { type: "testimonials", position: 6 },
    { type: "request_form", position: 7, data: { requestType: "quote" } },
    { type: "map", position: 8 },
    { type: "footer", position: 9 },
  ],
}

const GENERAL_SERVICE_TEMPLATE: TemplatePreset = {
  id: "general-service-default",
  category: "general_service",
  name: "Dienstverlening",
  description: "Flexibel design voor alle diensten",
  businessDefaults: {
    name: "Mijn Diensten",
    tagline: "Professionele service voor jou",
    description: "Wij bieden professionele diensten met aandacht voor detail en kwaliteit.",
    phone: "+31 6 12345678",
    email: "info@diensten.nl",
  },
  services: [
    { title: "Kennismakingsgesprek", description: "Gratis intake", price: "Gratis" },
    { title: "Standaard dienst", description: "Basis pakket", price: "€ 50" },
    { title: "Premium pakket", description: "Uitgebreid pakket", price: "€ 100" },
    { title: "Maatwerk", description: "Custom oplossing", price: "Op aanvraag" },
    { title: "Onderhoud", description: "Periodiek onderhoud", price: "€ 40/uur" },
  ],
  sections: [
    { type: "nav", position: 0 },
    { type: "hero", position: 1, data: { title: "Welkom", subtitle: "Wij zijn hier om te helpen" } },
    { type: "about", position: 2 },
    { type: "services", position: 3 },
    { type: "testimonials", position: 4 },
    { type: "contact", position: 5 },
    { type: "footer", position: 6 },
  ],
}

export const TEMPLATE_PRESETS: Record<BusinessCategory, TemplatePreset> = {
  bnb: BNB_TEMPLATE,
  hairdresser: HAIRDRESSER_TEMPLATE,
  gardener: GARDENER_TEMPLATE,
  coach: COACH_TEMPLATE,
  restaurant: RESTAURANT_TEMPLATE,
  photographer: PHOTOGRAPHER_TEMPLATE,
  freelancer: FREELANCER_TEMPLATE,
  construction: CONSTRUCTION_TEMPLATE,
  general_service: GENERAL_SERVICE_TEMPLATE,
}

export function getTemplatePreset(category: BusinessCategory): TemplatePreset | undefined {
  return TEMPLATE_PRESETS[category]
}

export function getAllTemplatePresets(): TemplatePreset[] {
  return Object.values(TEMPLATE_PRESETS)
}
