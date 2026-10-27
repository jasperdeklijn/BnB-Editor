import { ExampleCards } from "@/components/landing/landing-examples"
import { MarketingFaq, MarketingLinks, MarketingPage, MarketingSection } from "@/components/marketing/marketing-page"
import { MARKETING_PAGES } from "@/lib/marketing"
import { marketingMetadata } from "@/lib/seo/marketing"

const path = "/voorbeelden"
const page = MARKETING_PAGES[path]
export const metadata = marketingMetadata(path, page.title, page.description)

export default function VoorbeeldenPage() {
  return <MarketingPage path={path} heading="Ontdek de mogelijkheden met drie voorbeeldwebsites" intro="Bekijk een bed and breakfast, coach en hovenier als inspiratie voor je eigen website. Alle drie zijn fictieve demo's, opgebouwd met onderdelen uit de FlexPagina-editor. Het zijn geen echte klanten of klantresultaten.">
    <MarketingSection title="Kies een voorbeeld dat bij je aanbod past">
      <p>Open een demo en bekijk de indeling op mobiel en desktop. Let op de combinatie van een introductie, aanbod en veelgestelde vragen. Aanvragen en boekingen zijn uitgeschakeld; namen, teksten en eventuele tarieven zijn alleen ter illustratie.</p>
      <ExampleCards showAudienceLinks />
    </MarketingSection>
    <MarketingSection title="Van inspiratie naar je eigen bedrijfswebsite" soft>
      <p>Neem de opbouw als vertrekpunt en vul je eigen inhoud in. Welke vraag heeft een bezoeker? Welke beelden helpen je dienst of verblijf uit te leggen? En waar kan iemand contact opnemen? Kies secties die die vragen beantwoorden en laat onderwerpen weg die niet bij je bedrijf passen.</p>
      <p>De demo's laten vormgeving en inhoud zien. Ze vormen geen toezegging dat elke functie zonder instelling of uitbreiding beschikbaar is. Vergelijk de pakketten voor aanvragen, meertaligheid en de optionele uitbreiding Booking &amp; Facturatie.</p>
      <MarketingLinks paths={["/website-maken", "/website-voor-zzp", "/website-voor-bnb"]} />
    </MarketingSection>
    <MarketingFaq items={[
      { question: "Zijn dit websites van echte klanten?", answer: "Nee. De Tuinkamer, Ruimte voor jou en Buiten in Balans zijn fictieve voorbeeldbedrijven. De demo's zijn bedoeld om de vormgevingsmogelijkheden te laten zien." },
      { question: "Kan ik een formulier of boeking in de demo testen?", answer: "De voorbeeldsites versturen geen aanvragen en maken geen boekingen. Gebruik de interactieve editor-demo om de bediening te bekijken en probeer de testversie voor je eigen website." },
      { question: "Moet mijn website er precies zo uitzien?", answer: "Nee. Je kiest je eigen secties, teksten, beelden, kleuren en lettertypen binnen de beschikbare instellingen van de editor. Gebruik eigen inhoud of materiaal dat je mag hergebruiken." },
    ]} />
  </MarketingPage>
}
