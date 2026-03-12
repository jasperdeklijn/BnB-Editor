import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = {
  title: "Disclaimer | BnB Website Maken",
  description: "Disclaimer van BnB Website Maken.",
}

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Disclaimer">
      <div className="space-y-8 text-white/90">
        <section>
          <p className="text-white/70 mb-8">
            <em>Laatste update: maart 2026</em>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Algemene Disclaimer</h2>
          <p>
            BnB Website Maken biedt een website builder en hosting platform. Dit document verhelderst de aansprakelijkheidsgrenzen en risico's.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Ons Platform Biedt Alleen Technische Hosting</h2>
          <p className="mb-3">
            Het Platform:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Biedt alleen technische website builder en hosting diensten</li>
            <li>Voert geen controle uit op content voorafgaand aan publicatie</li>
            <li>Controleert niet op waarheid, legaliteit of kwaliteit van content</li>
            <li>Exerceert geen redactionele controle</li>
            <li>Fungeert als neutrale hosting provider, niet als uitgever</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Gebruiker Beheert Zijn Eigen Website</h2>
          <p className="mb-3">
            <strong>U bent volledig verantwoordelijk voor:</strong>
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Alle content op uw Website</li>
            <li>Naleving van wetten en regelgeving</li>
            <li>Respect voor intellectueel eigendom van anderen</li>
            <li>Privacy en bescherming van klantgegevens</li>
            <li>Alle claims van derden gerelateerd aan uw content</li>
            <li>Backup van uw content</li>
            <li>Veiligheid van uw account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Platform Is Niet Aansprakelijk Voor</h2>
          <p className="mb-3">
            BnB Website Maken is <strong>niet aansprakelijk</strong> voor:
          </p>
          <ul className="space-y-3 list-disc list-inside">
            <li>
              <strong>Content van derden:</strong> Content, afbeeldingen, video's, links van andere Website-eigenaren
            </li>
            <li>
              <strong>Slechte reputatie:</strong> Schade aan uw bedrijfsnaam/reputatie door comments of content van andere Websites
            </li>
            <li>
              <strong>Verlies van inkomsten:</strong> Verlies van verkoop, boekingen of omzet
            </li>
            <li>
              <strong>Verlies van data:</strong> Zoekgeraakte of beschadigde bestanden (zelfs niet door onze schuld)
            </li>
            <li>
              <strong>Downtime:</strong> Wanneer uw Website offline is om technische redenen
            </li>
            <li>
              <strong>Cyberaanvallen:</strong> Hacks, DDoS-aanvallen of andere beveiligingsincidenten
            </li>
            <li>
              <strong>Databreaches:</strong> Ongeautoriseerde toegang tot uw gegevens
            </li>
            <li>
              <strong>Derde-party claims:</strong> Aansprakelijkheid van internetproviders, adverteerders of partners
            </li>
            <li>
              <strong>Indirecte schade:</strong> Gederfde winsten, reputatie, business interruption
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">5. "As-Is" Disclaimer</h2>
          <p className="mb-3">
            Het Platform wordt aangeboden op een <strong>"as-is"</strong> basis:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Zonder garanties van welke aard dan ook</li>
            <li>Zonder garantie van geschiktheid voor enig doel</li>
            <li>Zonder garantie van nauwkeurigheid of volledigheid</li>
            <li>Zonder garantie van ononderbroken beschikbaarheid</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">6. Beperking van Aansprakelijkheid</h2>
          <p className="mb-3">
            De maximale aansprakelijkheid van BnB Website Maken voor alle vorderingen is beperkt tot:
          </p>
          <p className="text-base text-[var(--brand-blue)] font-semibold mb-3">
            Het bedrag dat u in het voorbije 12 maanden aan het Platform hebt betaald
          </p>
          <p className="mb-3">
            Dit geldt voor alle vormen van aansprakelijkheid, inclusief contractuele, wettelijke, onrechtmatige daad etc.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">7. Geen Garantie voor Beschikbaarheid</h2>
          <p className="mb-3">
            Hoewel we ons inspannen om hoge uptime te bieden:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>We garanderen geen 100% beschikbaarheid</li>
            <li>Onderhoud en updates kunnen downtime veroorzaken</li>
            <li>Technische storingen kunnen voorkomen</li>
            <li>U bent verantwoordelijk voor backups</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">8. Geen Garantie van Resultaten</h2>
          <p className="mb-3">
            Wij kunnen niet garanderen:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Dat uw Website meer bezoekers krijgt</li>
            <li>Dat u meer boekingen krijgt</li>
            <li>Ranking in zoekmachines (SEO)</li>
            <li>Conversie of verkoopresultaten</li>
            <li>Aangepaste business doelen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">9. Aansprakelijkheid van Gebruikers</h2>
          <p className="mb-3">
            U stelt BnB Website Maken vrijwarig van:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Claims gerelateerd aan uw Website</li>
            <li>Claims over uw content</li>
            <li>Geschillen met uw klanten</li>
            <li>Inbreuk op rechten van derden door uw content</li>
            <li>Schending van wetten en regelgeving door uw Website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">10. Links en Derden</h2>
          <p className="mb-3">
            BnB Website Maken:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Is niet verantwoordelijk voor content van linksites</li>
            <li>Onderschrijft niet de policies van derden</li>
            <li>Is niet verantwoordelijk voor advertenties op uw Website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">11. Seksuele of Illegale Content van Anderen</h2>
          <p className="mb-3">
            Hoewel we dergelijke content verwijderen:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Kunnen we dit niet volledig voorkomen</li>
            <li>Bent u verantwoordelijk voor moderation van opmerkingen/content op uw Website</li>
            <li>U kunt dit rapporteren via abuse@bnbwebsitemaken.nl</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">12. Geldig Recht</h2>
          <p>
            Deze disclaimer wordt beheerst door Nederlands recht. Geschillen zullen volgens Nederlands recht worden beslist.
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--brand-blue)]/20">
          <h3 className="text-lg font-semibold text-white mb-3">Begrijpt U Deze Disclaimer?</h3>
          <p className="mb-4">
            Door het Platform te gebruiken, accepteert u volledig deze disclaimer en alle daarin vermelde beperkingen van aansprakelijkheid.
          </p>
          <p>
            Vragen? Neem contact op via{" "}
            <a href="mailto:support@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline">
              support@bnbwebsitemaken.nl
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  )
}
