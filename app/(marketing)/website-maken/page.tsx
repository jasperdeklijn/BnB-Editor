import { LandingDemo } from "@/components/landing/landing-demo"
import { MarketingCards, MarketingFaq, MarketingLinks, MarketingPage, MarketingPlans, MarketingSection } from "@/components/marketing/marketing-page"
import { MARKETING_ACCESS_NOTICE, MARKETING_PAGES } from "@/lib/marketing"
import { marketingMetadata } from "@/lib/seo/marketing"

const path = "/website-maken"
const page = MARKETING_PAGES[path]
export const metadata = marketingMetadata(path, page.title, page.description)

export default function WebsiteMakenPage() {
  return <MarketingPage path={path} heading="Maak zelf een zakelijke website zonder code" intro="FlexPagina is een Nederlandse websitebouwer voor zzp'ers en kleine bedrijven. Bouw en beheer je bedrijfswebsite online met kant-en-klare secties. Je past de inhoud en uitstraling zelf aan, zonder te programmeren.">
    <MarketingSection title="Een plek voor je bedrijf, aanbod en contact">
      <p>Een bedrijfswebsite helpt bezoekers te begrijpen wat je doet en hoe ze je bereiken. Begin met de informatie die je klant nodig heeft: je diensten, je werkwijze, foto's van je werk en een duidelijke contactmogelijkheid. Maak aparte pagina's wanneer een onderwerp meer uitleg vraagt.</p>
      <MarketingLinks paths={["/website-voor-zzp", "/website-voor-bnb", "/voorbeelden"]} />
      <MarketingCards items={[
        { title: "Bouw met secties", text: "Voeg onder meer een intro, diensten, fotogalerie, veelgestelde vragen en contactgegevens toe. Verander teksten, afbeeldingen en volgorde in de visuele editor." },
        { title: "Geef je website een eigen uitstraling", text: "Kies kleuren en lettertypen en bekijk hoe je pagina's op mobiel en desktop overkomen. Werk inhoud bij wanneer je aanbod of openingstijden veranderen." },
        { title: "Maak contact makkelijk", text: "Gebruik een contactformulier. Voor het beheren van aanvragen en uitgebreidere contactmogelijkheden vergelijk je Silver en Gold. Online boeken vraagt om Booking & Facturatie." },
        { title: "Beheer je vindbaarheid", text: "Geef pagina's een duidelijke titel en beschrijving. Uitgebreide pagina-SEO en GA4-configuratie zijn pakketafhankelijk. Zoekmachines bepalen zelf of en wanneer een pagina in hun resultaten verschijnt." },
      ]} />
    </MarketingSection>
    <MarketingSection title="Van eerste opzet naar publicatie in vier stappen" soft>
      <ol className="grid gap-6 md:grid-cols-2">{[
        ["1. Maak een account", "Probeer de testversie en begin met je website. Een account aanmaken vereist geen creditcard."],
        ["2. Vul je eigen inhoud in", "Kies secties en voeg je teksten en foto's toe. Gebruik beeldmateriaal waarvoor je toestemming hebt."],
        ["3. Controleer je concept", "Lees je pagina's na, bekijk de mobiele weergave en controleer links en contactgegevens voordat je publiceert."],
        ["4. Controleer en publiceer", `${MARKETING_ACCESS_NOTICE} Controleer de pagina's die je wilt publiceren en koppel eventueel je eigen domein via de instellingen in je account.`],
      ].map(([title, text]) => <li key={title} className="rounded-3xl border border-[var(--landing-border)] bg-white p-6"><h3 className="mb-3 text-xl font-bold text-[var(--landing-secondary)]">{title}</h3><p>{text}</p></li>)}</ol>
    </MarketingSection>
    <LandingDemo />
    <MarketingSection title="Je eigen domein en hosting">
      <p>Hosting en ondersteuning voor een eigen domein en SSL horen bij de websitepakketten. Je kunt een bestaande domeinnaam koppelen; registratie en verlenging van een domeinnaam regel je bij je domeinprovider. Controleer bij het koppelen ook eventuele e-mailinstellingen. Een domeinkoppeling is geen verhuizing van je mailbox.</p>
      <MarketingLinks paths={["/website-overstappen"]} />
    </MarketingSection>
    <MarketingSection title="Wat past bij FlexPagina?" soft>
      <p>FlexPagina past bij een overzichtelijke bedrijfswebsite die je zelf wilt onderhouden. Je bouwt met de beschikbare componenten en instellingen. Het is geen belofte dat willekeurige plug-ins, maatwerkcode, een webshop of functies uit je oude website automatisch meekomen. Bekijk eerst de demo en probeer je belangrijkste pagina's uit.</p>
      <p>De testversie is in ontwikkeling: functies en vormgeving kunnen veranderen. Een gewone aanvraag is geen bevestigde boeking. Kies Booking &amp; Facturatie als je de beschikbare boekingsfuncties nodig hebt en controleer of ze bij jouw werkwijze passen.</p>
    </MarketingSection>
    <MarketingPlans />
    <MarketingFaq items={[
      { question: "Moet ik software installeren?", answer: "Je bouwt en beheert je website online in de editor. Voor het bewerken van de beschikbare secties hoef je geen code te schrijven." },
      { question: "Wat kan ik tijdens de testfase gratis doen?", answer: `${MARKETING_ACCESS_NOTICE} De officiële tarieven voor het betaalde aanbod volgen later.` },
      { question: "Kan ik later inhoud aanpassen?", answer: "Ja, je kunt teksten, afbeeldingen en secties in de editor aanpassen en je gecontroleerde wijzigingen opnieuw publiceren." },
    ]} />
  </MarketingPage>
}
