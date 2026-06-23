import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = {
  title: "Algemene Voorwaarden | Website Maker",
  description: "Lees de algemene voorwaarden van Website Maker.",
}

export default function TermsPage() {
  return (
    <LegalLayout title="Algemene Voorwaarden">
      <div className="space-y-8 text-white/90">
        <section>
          <p className="text-white/70 mb-8">
            <em>Laatste update: maart 2026</em>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Definities</h2>
          <ul className="space-y-3 list-disc list-inside">
            <li><strong>Platform:</strong> Website Maker, een website builder en hosting dienst.</li>
            <li><strong>Gebruiker:</strong> Een natuurlijk persoon die zich registreert en het Platform gebruikt.</li>
            <li><strong>Website:</strong> Een unieke website gemaakt door de Gebruiker via het Platform.</li>
            <li><strong>Content:</strong> Alle teksten, afbeeldingen, video's, bestanden en ander materiaal dat door een Gebruiker wordt geüpload.</li>
            <li><strong>Diensten:</strong> Het website builder en hosting aanbod van het Platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Dienstverlening</h2>
          <p className="mb-3">
            Het Platform biedt een website builder en hostingdienst waarmee Gebruikers zelf een website kunnen maken en beheren. Dit omvat:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Toegang tot de website builder</li>
            <li>Hosting van de Website</li>
            <li>Mogelijkheid om Content (teksten, afbeeldingen, video's) te uploaden</li>
            <li>Ondersteuning en technisch beheer van de infrastructuur</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Verantwoordelijkheid voor Content</h2>
          <p className="mb-3">
            De Gebruiker is volledig verantwoordelijk voor alle Content die op zijn/haar Website wordt geplaatst. Het Platform:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Controleert Content niet vooraf op juistheid, legaliteit of kwaliteit</li>
            <li>Biedt slechts technische hosting en geen redactioneel toezicht</li>
            <li>Is niet verantwoordelijk voor eventuele schade voortvloeiend uit Content van de Gebruiker</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Verboden Content</h2>
          <p className="mb-3">
            De Gebruiker mag de volgende Content niet uploaden of distribueren via het Platform:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Illegale content:</strong> Content die in strijd is met Nederlands of internationaal recht</li>
            <li><strong>Copyright schending:</strong> Content waarvan de Gebruiker geen rechten heeft</li>
            <li><strong>Malware en virussen:</strong> Schadelijke software of code</li>
            <li><strong>Haatdragende en discriminatoire content:</strong> Content die groepen discrimineert of ophitst tot geweld</li>
            <li><strong>Spam en phishing:</strong> Ongewenste berichten of pogingen tot fraude</li>
            <li><strong>Sexueel uitbuiting:</strong> Expliciete afbeeldingen van minderjarigen of dergelijke content</li>
            <li><strong>Privacyschending:</strong> Ongeautoriseerde verbreiding van persoonsgegevens</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">5. Recht op Verwijdering</h2>
          <p className="mb-3">
            Het Platform behoudt zich het recht voor om:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Content onmiddellijk te verwijderen indien deze in strijd is met deze voorwaarden</li>
            <li>Een Website offline te zetten zonder voorafgaande waarschuwing bij ernstige schendingen</li>
            <li>Het account van de Gebruiker te beëindigen indien herhaalde schendingen plaatsvinden</li>
          </ul>
          <p className="mt-3">
            Het Platform zal de Gebruiker waar mogelijk op de hoogte brengen van verwijderingen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">6. Hosting en Beschikbaarheid</h2>
          <p className="mb-3">
            Het Platform spannen zich in om een betrouwbare service aan te bieden, maar garandeert geen 100% uptime. Het Platform is niet aansprakelijk voor:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Onderhouds- of technische storingen</li>
            <li>Dataverlies of corruptie (Gebruikers zijn zelf verantwoordelijk voor back-ups)</li>
            <li>Voortdurende beschikbaarheid van de Website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">7. Aansprakelijkheid en Beperking</h2>
          <p className="mb-3">
            <strong>Beperking van aansprakelijkheid:</strong>
          </p>
          <p className="mb-3">
            Het Platform is niet aansprakelijk voor:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Directe of indirecte schade voortvloeiend uit het gebruik van het Platform</li>
            <li>Verlies van winsten, inkomsten of bedrijfsgoederen</li>
            <li>Schade veroorzaakt door Content van derden (andere Gebruikers)</li>
            <li>Beschadiging van reputatie door Content van andere Gebruikers</li>
          </ul>
          <p className="mt-3">
            De totale aansprakelijkheid van het Platform is beperkt tot het bedrag dat door de Gebruiker in het voorbije jaar aan het Platform is betaald.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">8. Beëindiging van Accounts</h2>
          <p className="mb-3">
            Het Platform kan een account onmiddellijk beëindigen zonder vergoeding indien:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>De Gebruiker herhaaldelijk deze voorwaarden schendt</li>
            <li>Het account gebruikt wordt voor illegale doeleinden</li>
            <li>Het account misbruikt wordt voor spam of phishing</li>
            <li>Het Platform daarom door externe organisaties wordt verzocht</li>
          </ul>
          <p className="mt-3">
            Bij beëindiging wordt de Website offline genomen en Content verwijderd. De Gebruiker heeft geen recht op schadevergoeding.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">9. Wijzigingen van de Voorwaarden</h2>
          <p className="mb-3">
            Het Platform behoudt zich het recht voor deze voorwaarden op elk moment te wijzigen. Voortdurend gebruik van het Platform na wijzigingen bedeutet acceptatie van de nieuwe voorwaarden.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">10. Toepasselijk Recht</h2>
          <p className="mb-3">
            Deze voorwaarden worden beheerst door Nederlands recht. Alle geschillen zullen worden uitgeouwd in overeenstemming met Nederlands recht en adressen worden ter kennis van de bevoegde rechter in Nederland gebracht.
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--brand-blue)]/20">
          <h3 className="text-lg font-semibold text-white mb-3">Vragen?</h3>
          <p>
            Neem contact met ons op via{" "}
            <a href="mailto:support@websitebouwer.nl" className="text-[var(--brand-blue)] hover:underline">
              support@websitebouwer.nl
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  )
}

