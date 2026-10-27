import { ExampleCards } from "@/components/landing/landing-examples"
import { MarketingCards, MarketingFaq, MarketingLinks, MarketingPage, MarketingPlans, MarketingSection } from "@/components/marketing/marketing-page"
import { MARKETING_PAGES } from "@/lib/marketing"
import { marketingMetadata } from "@/lib/seo/marketing"

const path = "/website-voor-zzp"
const page = MARKETING_PAGES[path]
export const metadata = marketingMetadata(path, page.title, page.description)

export default function WebsiteVoorZzpPage() {
  return <MarketingPage path={path} heading="Een website voor je werk als zzp'er" intro="Laat zien wat je doet, voor wie je werkt en hoe iemand contact opneemt. Met FlexPagina maak en beheer je zelf een bedrijfswebsite, zonder programmeerkennis. Zo kun je je diensten en informatie bijwerken wanneer je bedrijf verandert.">
    <MarketingSection title="Geef bezoekers antwoord voordat ze contact opnemen">
      <p>Een bezoeker wil snel weten of je kunt helpen. Schrijf concreet welke werkzaamheden je uitvoert, wat je aanpak is en in welk gebied je werkt als dat relevant is. Gebruik je eigen voorbeelden en foto's met toestemming. Echte informatie maakt je aanbod duidelijker dan algemene beloften.</p>
      <MarketingCards items={[
        { title: "Je diensten op een rij", text: "Beschrijf per dienst het probleem dat je oplost en wat de volgende stap is. Een korte website kan voldoende zijn; geef uitgebreidere diensten een eigen pagina als daar nuttige inhoud voor is." },
        { title: "Je werk laten zien", text: "Gebruik een galerij of projectsectie voor foto's en toelichting. Presenteer alleen eigen werk of materiaal waarvoor je rechten hebt. De FlexPagina-demo's zijn fictief en zijn geen portfolio van echte klanten." },
        { title: "Een duidelijke contactroute", text: "Maak je contactgegevens zichtbaar en voeg een contactformulier toe. Silver en Gold bieden extra mogelijkheden voor aanvragen. Beschrijf vooraf welke informatie je nodig hebt voor een kennismaking of offerte." },
        { title: "Zelf actueel houden", text: "Pas teksten, openingstijden en afbeeldingen in de editor aan. Controleer je wijzigingen op mobiel en desktop en publiceer daarna de nieuwe versie van je website." },
      ]} />
    </MarketingSection>
    <MarketingSection title="Een praktische opzet voor je eerste website" soft>
      <p>Begin met een homepage die uitlegt wat je doet, een pagina over je diensten en een contactpagina. Dit is een inhoudelijk startpunt, geen verplichte indeling. Combineer korte onderwerpen en maak alleen extra pagina's als die een eigen vraag beantwoorden.</p>
      <p>Gebruik op elke pagina een herkenbare titel en een logische volgorde. Zet een contactlink bij je aanbod, zodat bezoekers niet hoeven te zoeken. Vul eventuele tarieven en voorwaarden met je eigen actuele informatie; FlexPagina doet geen toezeggingen namens jouw bedrijf.</p>
      <MarketingLinks paths={["/website-maken", "/website-overstappen"]} />
    </MarketingSection>
    <MarketingSection title="Bekijk hoe verschillende dienstverleners hun aanbod kunnen presenteren">
      <p>Bekijk een coach en hovenier als inspiratie voor de opbouw, beelden en contactroute. Het zijn fictieve voorbeeldbedrijven; aanvragen en boekingen zijn in deze demo's uitgeschakeld.</p>
      <ExampleCards slugs={["coach", "hovenier"]} />
      <MarketingLinks paths={["/voorbeelden"]} />
    </MarketingSection>
    <MarketingSection title="Aanvragen of afspraken: kies wat je nodig hebt" soft>
      <p>Een informatieve website en een contactformulier zijn een ander vertrekpunt dan een boekingssysteem. Vergelijk de pakketten als je aanvragen wilt beheren. Wil je bezoekers online laten boeken en vanuit boekingen facturen maken, onderzoek dan de aparte uitbreiding Booking &amp; Facturatie. Die is beschikbaar bij elk websitepakket.</p>
      <p>Je kunt je eigen domein koppelen. Heb je al een website en zakelijke e-mail? Bouw de nieuwe versie eerst op en controleer domein- en e-mailinstellingen voordat je overschakelt.</p>
    </MarketingSection>
    <MarketingPlans />
    <MarketingFaq items={[
      { question: "Is FlexPagina geschikt voor een klein bedrijf?", answer: "FlexPagina richt zich op zzp'ers en kleine ondernemers die een bedrijfswebsite met de beschikbare secties willen maken. Probeer je belangrijkste pagina's en contactroute in de testversie om te bepalen of het past." },
      { question: "Heb ik een ontwerper nodig om iets te wijzigen?", answer: "Voor teksten, foto's, secties en de beschikbare vormgevingsinstellingen gebruik je de visuele editor. Voor die aanpassingen hoef je niet te programmeren." },
      { question: "Krijg ik automatisch meer aanvragen?", answer: "Er is geen garantie op bezoekers, vindbaarheid of aanvragen. Een duidelijke website, actuele inhoud en een werkende contactroute helpen bezoekers wel om je aanbod te begrijpen en contact op te nemen." },
    ]} />
  </MarketingPage>
}
