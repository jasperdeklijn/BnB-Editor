import Link from "next/link"
import { MarketingCards, MarketingFaq, MarketingLinks, MarketingPage, MarketingSection } from "@/components/marketing/marketing-page"
import { MARKETING_PAGES } from "@/lib/marketing"
import { marketingMetadata } from "@/lib/seo/marketing"

const path = "/website-overstappen"
const page = MARKETING_PAGES[path]
export const metadata = marketingMetadata(path, page.title, page.description)

export default function WebsiteOverstappenPage() {
  return <MarketingPage path={path} heading="Je website vervangen? Bereid je overstap rustig voor" intro="Bouw je nieuwe bedrijfswebsite eerst op in FlexPagina en controleer de inhoud voordat je je domein omzet. Neem teksten en foto's over waarvoor je rechten hebt. Houd je bestaande website beschikbaar tijdens de voorbereiding.">
    <MarketingSection title="Breng in kaart wat je wilt behouden">
      <p>Maak een overzicht van je huidige pagina's, belangrijke webadressen en contactmogelijkheden. Welke diensten zijn nog actueel? Welke pagina's krijgen bezoekers of zijn vanaf andere websites gelinkt? Bewaar je oorspronkelijke teksten en beelden en noteer welke formulieren, boekingen of andere koppelingen je gebruikt.</p>
      <p>Controleer ook waar je domein is geregistreerd en wie je e-mail beheert. Websitehosting, domeinregistratie en e-mail kunnen bij verschillende partijen staan. Een overstap van je website verplaatst deze diensten niet automatisch.</p>
    </MarketingSection>
    <MarketingSection title="Inhoud overnemen: zelf opbouwen of een concept laten omzetten" soft>
      <p>Je kunt je pagina's zelf opnieuw opbouwen met de secties van FlexPagina. De editor bevat daarnaast een functie om geselecteerde openbare websitepagina's met AI naar een bewerkbaar concept om te zetten. Deze functie is afhankelijk van beschikbaarheid van de ingestelde AI-dienst. Je bevestigt vooraf dat je de inhoud en afbeeldingen mag hergebruiken en dat de gekozen pagina's mogen worden verwerkt.</p>
      <p>Controleer het resultaat altijd. Een omzetting kan tekst, indeling of beelden missen en is geen exacte kopie van je oude website. Bestaande formulieren, boekingswidgets, plug-ins en maatwerkfuncties moet je opnieuw beoordelen en instellen. Er is geen garantie op een volledige automatische migratie of behoud van alle oude URL's.</p>
      <MarketingLinks paths={["/website-maken", "/voorbeelden"]} />
    </MarketingSection>
    <MarketingSection title="Een overstap in vier overzichtelijke stappen">
      <MarketingCards items={[
        { title: "1. Bouw je nieuwe concept", text: "Neem bruikbare inhoud over en richt de pagina's in. Houd je oude website voorlopig online. Een geïmporteerd concept moet eerst worden gecontroleerd voordat je het publiceert." },
        { title: "2. Controleer de hele klantreis", text: "Bekijk mobiel en desktop. Loop navigatie, contactgegevens, afbeeldingen en formulieren na. Controleer boekingsinstellingen afzonderlijk als je de optionele boekingsuitbreiding gebruikt." },
        { title: "3. Bereid domein en e-mail voor", text: "Controleer de benodigde DNS-instellingen in je account. Noteer bestaande records en behoud de records die je e-mailprovider nodig heeft, zoals MX, SPF, DKIM en DMARC. Vraag hulp als je niet zeker weet welke records bij welke dienst horen." },
        { title: "4. Publiceer en controleer opnieuw", text: "Controleer je pakket, publiceer en koppel je domein wanneer alles klaarstaat. DNS-wijzigingen worden niet overal direct zichtbaar. Controleer na de omschakeling zowel je website als je zakelijke e-mail." },
      ]} />
    </MarketingSection>
    <MarketingSection title="Let op bestaande links en vindbaarheid" soft>
      <p>Vergelijk de oude en nieuwe webadressen. Behoud waar mogelijk herkenbare pagina-adressen en bepaal voor vervallen URL's welke nieuwe pagina het beste aansluit. Als een permanente redirect nodig is, controleer dan waar die voor jouw domein kan worden ingesteld. Een import maakt geen automatische redirectkaart voor je oude website.</p>
      <p>Controleer na de overstap paginatitels, beschrijvingen, interne links en de sitemap van je gepubliceerde website. Als je al Search Console of Bing Webmaster Tools gebruikt, inspecteer dan de belangrijkste URL's. Ook met een zorgvuldige overstap kunnen zoekposities tijdelijk veranderen; behoud van posities is niet gegarandeerd.</p>
    </MarketingSection>
    <MarketingSection title="Controleer je pakket voordat je verhuist">
      <p>Het aantal gepubliceerde pagina's en functies verschilt per websitepakket. Vergelijk het aanbod met je huidige website en probeer eerst de onderdelen die voor jouw bedrijf onmisbaar zijn. FlexPagina is nog in de testfase; de officiële tarieven worden later bekendgemaakt.</p>
      <Link href="/pricing" className="inline-flex min-h-11 items-center font-bold text-[var(--landing-primary)] underline underline-offset-4">Bekijk de prijzen en pakketten</Link>
    </MarketingSection>
    <MarketingFaq items={[
      { question: "Wordt mijn hele website automatisch verhuisd?", answer: "Nee. Je bouwt een nieuwe website op of gebruikt, als de AI-dienst beschikbaar is, een omzetting van openbare pagina's als startpunt. Je controleert het concept zelf. Mailboxen, formulieren, widgets, oude URL's en maatwerk worden niet automatisch volledig verhuisd." },
      { question: "Kan ik mijn domeinnaam behouden?", answer: "Je kunt een eigen domein koppelen. Controleer eerst bij welke provider je domein en e-mail staan en volg de domeininstellingen in je account. Het koppelen van je website is iets anders dan het verhuizen van je domeinregistratie of mailboxen." },
      { question: "Wanneer kan ik mijn oude hosting opzeggen?", answer: "Controleer eerst of de nieuwe website op je domein werkt en of zakelijke e-mail en andere diensten correct blijven functioneren. Bekijk daarna je bestaande contract en welke diensten eraan verbonden zijn voordat je opzegt." },
    ]} />
  </MarketingPage>
}
