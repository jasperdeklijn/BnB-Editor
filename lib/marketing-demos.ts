import type { SectionStyles } from "@/lib/types"

// Public, fictional examples. No customer records, forms or booking APIs are used.
export const MARKETING_DEMOS = [
  {
    slug: "bnb", category: "B&B", name: "De Tuinkamer", label: "Een gastvrij begin van elk verblijf",
    title: "Even weg. Helemaal thuis.", subtitle: "Word wakker tussen het groen. Een rustige kamer, een vers ontbijt en alle tijd voor elkaar.",
    description: "Laat de sfeer van je verblijf zien en help gasten hun volgende overnachting te kiezen.",
    about: "Aan de rand van het dorp ligt De Tuinkamer: een kleine B&B met ruimte om op adem te komen. Begin de dag met een ontbijt aan de tuintafel en ontdek daarna de wandelpaden in de omgeving.",
    offerTitle: "Een verblijf dat bij je past", cta: "Bekijk de kamers", layout: "split", styleType: "elegant",
    accent: "#385344", background: "#f2f4ee", image: "/demos/tuinkamer.svg",
    offers: [
      { name: "De tuinkamer", price: "€ 95", period: "per nacht", description: "Voor twee personen, met uitzicht op de tuin.", features: ["Ontbijt inbegrepen", "Eigen badkamer", "Zitje in de tuin"] },
      { name: "Een weekend weg", price: "€ 210", period: "per arrangement", description: "Twee nachten om helemaal tot rust te komen.", features: ["Twee overnachtingen", "Elke ochtend ontbijt", "Late check-out"] },
    ],
    faq: { question: "Wat kun je in de omgeving doen?", answer: "Maak een wandeling door het groen, ontdek het dorp of neem de fiets mee voor een dag buiten. Dit is voorbeeldinhoud voor een B&B-website." },
  },
  {
    slug: "coach", category: "Coach", name: "Ruimte voor jou", label: "Persoonlijk contact begint online",
    title: "Meer rust. Je eigen richting.", subtitle: "Sta stil bij wat voor jou belangrijk is. Persoonlijke coaching voor nieuwe inzichten en haalbare stappen.",
    description: "Vertel wie je bent, maak je werkwijze concreet en nodig bezoekers uit voor een kennismaking.",
    about: "Soms helpt het om samen naar je vragen te kijken. Bij Ruimte voor jou beginnen we met luisteren: waar loop je tegenaan en wat wil je veranderen? Van daaruit werken we aan kleine stappen die bij jouw dagelijks leven passen.",
    offerTitle: "Kies jouw eerste stap", cta: "Ontdek de begeleiding", layout: "banner", styleType: "soft",
    accent: "#755442", background: "#faf4ee", image: "/demos/ruimte.svg",
    offers: [
      { name: "Kennismaken", price: "Gratis", period: "30 minuten", description: "Ontdek of de begeleiding bij je past.", features: ["Ruimte voor jouw vraag", "Uitleg over de werkwijze", "Vrijblijvend kennismaken"] },
      { name: "Individuele sessie", price: "€ 85", period: "60 minuten", description: "Aandacht voor wat jij nodig hebt.", features: ["Persoonlijk gesprek", "Concrete vervolgstappen", "Oefeningen voor thuis"] },
    ],
    faq: { question: "Hoe verloopt een kennismaking?", answer: "Tijdens een eerste gesprek bespreek je jouw vraag en ontdek je of de aanpak bij je past. Dit is voorbeeldinhoud voor een coachingswebsite." },
  },
  {
    slug: "hovenier", category: "Hovenier", name: "Buiten in Balans", label: "Laat je werk voor je spreken",
    title: "Een tuin om in te leven.", subtitle: "Van een eerste schets tot de laatste plant. Tuinontwerp, aanleg en onderhoud met aandacht voor jouw buitenruimte.",
    description: "Presenteer je vakmanschap en diensten, met een duidelijke route naar een offerteaanvraag.",
    about: "Een fijne tuin begint met jouw ideeën. Wil je meer groen, een plek om buiten te eten of juist minder onderhoud? Buiten in Balans denkt mee over een praktische indeling en beplanting die past bij de plek.",
    offerTitle: "Van idee tot onderhoud", cta: "Bekijk onze diensten", layout: "split", styleType: "modern",
    accent: "#34533b", background: "#edf2e8", image: "/demos/buiten.svg",
    offers: [
      { name: "Ontwerp & aanleg", price: "Op maat", description: "Een plan voor jouw tuin en de uitvoering ervan.", features: ["Wensen en ruimte bespreken", "Beplantingsplan", "Aanleg in overleg"] },
      { name: "Tuinonderhoud", price: "€ 75", period: "per uur", description: "Een verzorgde tuin, het hele jaar door.", features: ["Snoeien en bijwerken", "Seizoensonderhoud", "Eenmalig of regelmatig"] },
    ],
    faq: { question: "Kan ik ook alleen onderhoud laten doen?", answer: "Ja, je kunt kiezen voor een losse onderhoudsbeurt of een terugkerende afspraak. Dit is voorbeeldinhoud voor een hovenierswebsite." },
  },
]

export function getDemoStyles(demo: (typeof MARKETING_DEMOS)[number]): SectionStyles {
  return { accentColor: demo.accent, backgroundColor: demo.background, textColor: "#24382d", surfaceColor: "#ffffff" }
}
