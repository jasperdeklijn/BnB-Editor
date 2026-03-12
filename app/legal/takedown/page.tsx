import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = {
  title: "Notice & Takedown | BnB Website Maken",
  description: "Procedure voor melding van illegale of schadelijke content.",
}

export default function TakedownPage() {
  return (
    <LegalLayout title="Notice & Takedown Procedure">
      <div className="space-y-8 text-white/90">
        <section>
          <p className="text-white/70 mb-8">
            <em>Laatste update: maart 2026</em>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Inleiding</h2>
          <p>
            Deze pagina beschrijft hoe u illegale of schadelijke content op het Platform kunt melden. BnB Website Maken neemt dergelijke meldingen serieus en zal snel optreden.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Wat Kan Ik Melden?</h2>
          <p className="mb-3">
            U kunt het volgende melden:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Copyright-inbreuk</li>
            <li>Merk-inbreuk</li>
            <li>Illegale content (drugshandel, fraude, etc.)</li>
            <li>Haatdragende of discriminatoire content</li>
            <li>Seksuele exploitatie van minderjarigen</li>
            <li>Phishing of malware</li>
            <li>Privacy-schending (persoonlijke gegevens)</li>
            <li>Spam of oplichting</li>
            <li>Andere illegale activiteiten</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Hoe Te Rapporteren</h2>
          <p className="mb-4">
            Stuur een e-mail naar:{" "}
            <a href="mailto:abuse@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline font-semibold">
              abuse@bnbwebsitemaken.nl
            </a>
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Vereiste Informatie</h3>
          <p className="mb-3">
            Uw melding moet het volgende bevatten voor maximale efficiëntie:
          </p>
          <ul className="space-y-3 list-disc list-inside">
            <li>
              <strong>URL van de pagina:</strong> De volledige link naar de content/Website
              <br />
              <em className="text-white/70">Voorbeeld: https://example.bnbwebsitemaken.nl/page</em>
            </li>
            <li>
              <strong>Beschrijving van de overtreding:</strong> Wat is er illegaal of schadelijk?
              <br />
              <em className="text-white/70">Voorbeeld: "Deze pagina distribueert vervalste designer-schoenen (merkschending)"</em>
            </li>
            <li>
              <strong>Voor copyright-claims:</strong> 
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Uw volledige naam en adres</li>
                <li>Contactgegevens (telefoon/e-mail)</li>
                <li>Details van het auteursrecht (werk, datum, registratie)</li>
                <li>Verklaring onder straf van meineed dat u de rechtseigenaar bent</li>
              </ul>
            </li>
            <li>
              <strong>Contactgegevens melder:</strong> Naam, e-mailadres, telefoon
            </li>
            <li>
              <strong>Ondertekening:</strong> Een fysieke handtekening (scan) of digitale handtekening
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Mogelijke Acties</h2>
          <p className="mb-3">
            Na ontvangst van een geldige melding zal het Platform:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Onderzoeken</strong> of de content daadwerkelijk illegaal is</li>
            <li><strong>Content verwijderen</strong> als dit gerechtvaardigd is</li>
            <li><strong>Website offline zetten</strong> bij ernstige schendingen</li>
            <li><strong>Account opschorten/beëindigen</strong> bij herhaalde schendingen</li>
            <li><strong>Autoriteiten informeren</strong> bij vermoeden van criminaliteit</li>
            <li><strong>U informeren</strong> over ondernomen acties</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">5. Reactietijd</h2>
          <p className="mb-3">
            BnB Website Maken streeft ernaar:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Meldingen binnen <strong>48 uur</strong> te beoordelen</li>
            <li>Duidelijke content <strong>onmiddellijk</strong> te verwijderen</li>
            <li>U binnen <strong>30 dagen</strong> van maatregelen op de hoogte te brengen</li>
          </ul>
          <p className="mt-3">
            Complexe zaken kunnen langer duren.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">6. Waarschuwing voor Misbruik</h2>
          <p className="mb-3">
            Onwaar of misleidende meldingen kunnen:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Juridische gevolgen hebben</li>
            <li>Leiden tot vervolging wegens valse aangiften</li>
            <li>U civielrechtelijk aansprakelijk maken</li>
          </ul>
          <p className="mt-3">
            Zorg ervoor dat uw melding waarheidsgetrouw is.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">7. Beroepsprocedure</h2>
          <p className="mb-3">
            Bent u het niet eens met een verwijdering? U kunt beroep instellen:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Stuur een e-mail naar <a href="mailto:appeals@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline">appeals@bnbwebsitemaken.nl</a></li>
            <li>Leg uit waarom u het niet eens bent</li>
            <li>Dien aanvullende bewijzen in</li>
            <li>We beoordelen het beroep binnen 30 dagen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">8. Juridisch Kader</h2>
          <p className="mb-3">
            Deze procedure voldoet aan:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Digital Millennium Copyright Act (DMCA)</strong> (VS)</li>
            <li><strong>Directive on Electronic Commerce 2000/31/EC (E-commerce Directive)</strong> (EU)</li>
            <li><strong>Dutch Copyright Law</strong></li>
            <li><strong>Dutch Criminal Law</strong></li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">9. Contact</h2>
          <p className="mb-3">
            <strong>Voor meldingen van illegale content:</strong>
          </p>
          <p className="mb-4">
            E-mail:{" "}
            <a href="mailto:abuse@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline font-semibold">
              abuse@bnbwebsitemaken.nl
            </a>
          </p>

          <p className="mb-3">
            <strong>Voor beroepsprocedures:</strong>
          </p>
          <p>
            E-mail:{" "}
            <a href="mailto:appeals@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline font-semibold">
              appeals@bnbwebsitemaken.nl
            </a>
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--brand-blue)]/20">
          <h3 className="text-lg font-semibold text-white mb-3">Dank u voor het Helpen</h3>
          <p>
            Dank u dat u BnB Website Maken veilig en wettelijk confrom houdt. Samen bouwen we een vertrouwde platform.
          </p>
        </section>
      </div>
    </LegalLayout>
  )
}
