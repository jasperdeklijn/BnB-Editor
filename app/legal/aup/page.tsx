import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = {
  title: "Acceptable Use Policy | BnB Website Maken",
  description: "Lees onze Acceptable Use Policy.",
}

export default function AUPPage() {
  return (
    <LegalLayout title="Acceptable Use Policy">
      <div className="space-y-8 text-white/90">
        <section>
          <p className="text-white/70 mb-8">
            <em>Laatste update: maart 2026</em>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Inleiding</h2>
          <p>
            Deze Acceptable Use Policy (AUP) beschrijft welk gedrag en content niet acceptabel zijn op BnB Website Maken. Door het Platform te gebruiken, gaat u akkoord met deze beperkingen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Verboden Activiteiten</h2>
          <p className="mb-3">
            U mag het Platform <strong>niet</strong> gebruiken voor:
          </p>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">A. Illegale Activiteiten</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Criminaliteit, fraude of oplichting</li>
            <li>Drugshandel of illegale goederen</li>
            <li>Witwassen van geld</li>
            <li>Terrorisme of financiering daarvan</li>
            <li>Mensenhandel of uitbuiting</li>
            <li>Diefstal of heling</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">B. Intellectueel Eigendom Schending</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Uploaden van inbreuk makende content (films, muziek, software)</li>
            <li>Gebruik van merken of logoïs zonder toestemming</li>
            <li>Plagiarisme of ongeautoriseerde reproduktie</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">C. Malware en Cyberaanvallen</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Distributie van virussen, trojans, of schadelijke software</li>
            <li>Phishing of social engineering</li>
            <li>Hacking of ongeautoriseerde toegang</li>
            <li>DDoS-aanvallen of netwerk-verstoring</li>
            <li>Exploitation van beveiligingslekken</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">D. Haatdragende en Discriminatoire Content</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Race, etnische achtergrond, godsdienst of nationaliteit-gebaseerde haat</li>
            <li>Seksuele discrminatie of heteronormativiteit-propaganda</li>
            <li>Oproepen tot geweld tegen groepen</li>
            <li>Dehumanisering van minderheidsgroepen</li>
            <li>Antisemitisme, islamofobie, christenfobie of ander religieus extremisme</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">E. Spam en Phishing</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Massale ongewenste e-mails en berichten</li>
            <li>Phishing of poging tot gestolen gegevens</li>
            <li>Spam-links in content</li>
            <li>Scamvertisements</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">F. Privacyschending</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Het publiceren van persoonlijke gegevens van anderen zonder toestemming</li>
            <li>Doxing (persoongegevens publiceren om te stalken of lastig vallen)</li>
            <li>Ongeautoriseerde opname of screening sharing</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">G. Seksuele Exploitatie</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Kiddie porn of afbeeldingen van minderjarige seks</li>
            <li>Exploitatief niet-consensueel porno</li>
            <li>Sextortion (afpersing met seksueel materiaal)</li>
            <li>Grooming van minderjarigen</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">H. Oplichting en Fraude</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Pyramid schemes of MLM-fraude</li>
            <li>Fake dating/romance scams</li>
            <li>Gezondheidsfraude (vals geneesmiddelen aanbieden)</li>
            <li>Ponzi-schema's</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mt-5 mb-3">I. Geweld en Zelfbeschadiging</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Dreiging met fysiek geweld</li>
            <li>Aanzetting tot zelfmoord</li>
            <li>Instructies voor zelfverwonding</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Resource Misbruik</h2>
          <p className="mb-3">
            U mag de Platform-bronnen niet misbruiken:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Overmatige bandbreedte of storage voor niet-gerelateerde zaken</li>
            <li>Cryptocurrency mining op het Platform</li>
            <li>Botting of geautomatiseerde scraping</li>
            <li>Bruteforce aanvallen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Gevolgen van Schending</h2>
          <p className="mb-3">
            Bij schending van deze AUP kan het Platform:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Content onmiddellijk verwijderen</li>
            <li>De Website offline zetten</li>
            <li>Het account uitschakelen</li>
            <li>Maatregelen nemen tegen spam/malware</li>
            <li>Informatie verstrekken aan wetshandhavingsautoriteiten</li>
            <li>Het account permanent verwijderen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">5. Rapportage</h2>
          <p className="mb-3">
            Als u content ziet die deze AUP schendt, rapporteer dit via:
          </p>
          <p>
            <a href="mailto:abuse@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline">
              abuse@bnbwebsitemaken.nl
            </a>
          </p>
          <p className="mt-3">
            Geef zoveel mogelijk details mee om ons te helpen snel te reageren.
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--brand-blue)]/20">
          <h3 className="text-lg font-semibold text-white mb-3">Vragen?</h3>
          <p>
            Neem contact op via{" "}
            <a href="mailto:support@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline">
              support@bnbwebsitemaken.nl
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  )
}
