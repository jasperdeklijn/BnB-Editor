// Public marketing copy only. Billing amounts and subscription behavior live in lib/pricing.ts.
import { DEFAULT_ALL_FEATURES_INCLUDED } from "@/lib/subscriptions"

export const MARKETING_TEST_LABEL = "Testversie"
export const MARKETING_PRICE_NOTICE = "De officiële tarieven volgen na de testfase. Daarom zijn de prijzen voorlopig vervaagd."
export const MARKETING_ACCESS_NOTICE = DEFAULT_ALL_FEATURES_INCLUDED
  ? "Tijdens de testfase krijg je tijdelijk gratis Gold-toegang, inclusief publiceren, Booking & Facturatie en meertaligheid. Betaalde abonnementen zijn nog niet beschikbaar."
  : "Je kunt gratis een account aanmaken en je website opbouwen. Voor publiceren heb je een websitepakket nodig."
export const MARKETING_PACKAGE_SCOPE_NOTICE = "De pakketvergelijking beschrijft de beoogde betaalde pakketten en hun limieten. " + MARKETING_ACCESS_NOTICE
export const MARKETING_BOOKING_NOTICE = DEFAULT_ALL_FEATURES_INCLUDED
  ? "Booking & Facturatie is tijdens de testfase tijdelijk inbegrepen. In het betaalde aanbod is dit een afzonderlijke uitbreiding voor Bronze, Silver en Gold."
  : "Booking & Facturatie is een afzonderlijke betaalde uitbreiding voor Bronze, Silver en Gold."

export const MARKETING_PAGES = {
  "/website-maken": {
    label: "Website maken",
    title: "Zelf een zakelijke website maken zonder code",
    description: "Maak zelf je bedrijfswebsite met FlexPagina. Bewerk teksten, foto's en secties, koppel je eigen domein en ontdek de Nederlandse websitebouwer in de testversie.",
  },
  "/website-voor-zzp": {
    label: "Website voor zzp",
    title: "Website maken voor zzp en kleine bedrijven",
    description: "Maak als zzp'er een website voor je diensten, werk en contactgegevens. Beheer je inhoud zelf en vergelijk de pakketten en fictieve demo's van FlexPagina.",
  },
  "/website-overstappen": {
    label: "Website overstappen",
    title: "Je website vervangen en overstappen naar FlexPagina",
    description: "Bouw je nieuwe website op voordat je overstapt. Lees hoe je inhoud, domein, e-mail en bestaande URL's controleert en wat website-overzetting wel en niet doet.",
  },
  "/website-voor-bnb": {
    label: "Website voor B&B",
    title: "Een eigen website maken voor je bed and breakfast",
    description: "Presenteer je B&B met sfeerbeelden, kamers en contactinformatie. Ontdek de fictieve demo en de optionele uitbreiding Booking & Facturatie van FlexPagina.",
  },
  "/voorbeelden": {
    label: "Voorbeeldwebsites",
    title: "Voorbeeldwebsites voor B&B, coach en hovenier",
    description: "Bekijk drie fictieve voorbeeldwebsites van FlexPagina: een bed and breakfast, coach en hovenier. Ontdek hoe secties en vormgeving bij je bedrijf passen.",
  },
} as const

export type MarketingPath = keyof typeof MARKETING_PAGES
