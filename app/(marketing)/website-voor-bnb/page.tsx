import { ExampleCards } from "@/components/landing/landing-examples"
import { MarketingCards, MarketingFaq, MarketingLinks, MarketingPage, MarketingPlans, MarketingSection } from "@/components/marketing/marketing-page"
import { MARKETING_BOOKING_NOTICE, MARKETING_PAGES } from "@/lib/marketing"
import { BOOKING_ADDON_FEATURES } from "@/lib/pricing"
import { marketingMetadata } from "@/lib/seo/marketing"

const path = "/website-voor-bnb"
const page = MARKETING_PAGES[path]
export const metadata = marketingMetadata(path, page.title, page.description)

export default function WebsiteVoorBnbPage() {
  return <MarketingPage path={path} heading="Maak een eigen website voor je bed and breakfast" intro="Laat gasten kennismaken met je verblijf voordat ze aankomen. Presenteer je kamers, sfeerbeelden, voorzieningen en praktische informatie op een website die je zelf beheert. Online boeken voeg je afzonderlijk toe met Booking & Facturatie.">
    <MarketingSection title="Help je gast een verblijf te kiezen">
      <p>Een B&amp;B-website moet sfeer overbrengen én praktische vragen beantwoorden. Toon je eigen foto's en leg duidelijk uit wat gasten kunnen verwachten. Gebruik alleen actuele informatie over je verblijf: geen voorbeeldtarieven of voorzieningen uit een demo die je zelf niet aanbiedt.</p>
      <MarketingCards items={[
        { title: "Kamers en voorzieningen", text: "Beschrijf voor hoeveel gasten een kamer geschikt is, wat erbij hoort en welke voorzieningen aanwezig zijn. Gebruik fotogalerijen en duidelijke teksten met je eigen aanbod." },
        { title: "Aankomst en omgeving", text: "Geef route-informatie, in- en uitchecktijden en eventuele parkeermogelijkheden. Vertel over activiteiten in de omgeving die werkelijk bij je locatie passen." },
        { title: "Tarieven en afspraken", text: "Maak duidelijk welke prijzen, voorwaarden en eventuele toeslagen voor jouw verblijf gelden. Houd deze informatie zelf actueel en controleer de aansluiting op je boekingsinstellingen." },
        { title: "Contact of reserveren", text: "Bied een duidelijke contactmogelijkheid. Wil je online boekingen ontvangen, onderzoek dan de aparte boekingsuitbreiding. Een contactaanvraag is nog geen bevestigde reservering." },
      ]} />
    </MarketingSection>
    <MarketingSection title="Bekijk de fictieve B&B De Tuinkamer" soft>
      <p>De Tuinkamer laat zien hoe een gastvrije introductie, beelden, aanbod en veelgestelde vragen samenkomen. Het is een fictief voorbeeldbedrijf. Kamers, voorzieningen en tarieven zijn voorbeeldinhoud; aanvragen en boekingen zijn uitgeschakeld.</p>
      <ExampleCards slugs={["bnb"]} />
      <MarketingLinks paths={["/voorbeelden"]} />
    </MarketingSection>
    <MarketingSection title="Je basiswebsite en Booking & Facturatie">
      <p>Met een websitepakket bouw en publiceer je de informatie over je B&amp;B, met hosting en ondersteuning voor je eigen domein. In het beoogde betaalde aanbod bevat het basispakket geen boekingssysteem. {MARKETING_BOOKING_NOTICE}</p>
      <ul className="grid gap-3 sm:grid-cols-2">{BOOKING_ADDON_FEATURES.map(feature => <li key={feature} className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-3">{feature}</li>)}</ul>
      <p>De uitbreiding omvat ook het beheren van de boekbare diensten. Stel je aanbod en beschikbaarheid in en controleer de volledige boekingsroute voordat je deze aan gasten aanbiedt. Test de werking voor jouw verblijf; de testversie blijft in ontwikkeling.</p>
    </MarketingSection>
    <MarketingSection title="Controleer agenda's en externe boekingskanalen apart" soft>
      <p>Gebruik je daarnaast een boekingsplatform of een externe agenda? Controleer zelf welke koppeling en uitwisseling je nodig hebt. Ga niet uit van een directe Booking.com-koppeling, realtime synchronisatie of een volledig channelmanager-systeem. Die werking is voor deze pagina niet bevestigd.</p>
      <p>Voorkom dat een gast uit tegenstrijdige informatie kiest: controleer prijzen en beschikbaarheid in alle kanalen die je gebruikt. Een afbeelding of kalender in een voorbeeldwebsite bewijst geen werkende integratie voor jouw account.</p>
      <MarketingLinks paths={["/website-maken", "/website-overstappen"]} />
    </MarketingSection>
    <MarketingPlans />
    <MarketingFaq items={[
      { question: "Hoe krijg ik toegang tot online boekingen?", answer: `${MARKETING_BOOKING_NOTICE} Stel de boekbare diensten en beschikbaarheid in en controleer de werking voordat je gasten laat boeken.` },
      { question: "Kan ik de voorbeeld-B&B echt boeken?", answer: "Nee. De Tuinkamer is een fictieve demo. De informatie en tarieven zijn voorbeelden en de demo verstuurt geen aanvragen of boekingen." },
      { question: "Kan ik mijn website in meerdere talen aanbieden?", answer: "Meertaligheid is inbegrepen bij Gold en als uitbreiding beschikbaar bij Bronze en Silver. Je moet de inhoud per taal controleren; een meertalige website is geen garantie op vindbaarheid of boekingen." },
    ]} />
  </MarketingPage>
}
