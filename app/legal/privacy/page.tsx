import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = {
  title: "Privacyverklaring | Website Maker",
  description: "Lees hoe we uw persoonsgegevens verwerken op Website Maker.",
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacyverklaring">
      <div className="space-y-8 text-white/90">
        <section>
          <p className="text-white/70 mb-8">
            <em>Laatste update: maart 2026</em>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Inleiding</h2>
          <p>
            Website Maker ("het Platform") respecteert uw privacy. Deze privacyverklaring beschrijft hoe we uw persoonsgegevens verzamelen, gebruiken en beschermen in overeenstemming met de Algemene Verordening Gegevensbescherming (GDPR/AVG).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Welke Persoonsgegevens We Verzamelen</h2>
          <p className="mb-3">
            We verzamelen de volgende categorieën persoonsgegevens:
          </p>
          <ul className="space-y-3 list-disc list-inside">
            <li><strong>Registratiegegevens:</strong> Voor- en achternaam, e-mailadres, wachtwoord en bedrijfsinformatie</li>
            <li><strong>Betalingsgegevens:</strong> Factureringsadres en betalingsinformatie (via veilige betalingsprocessors)</li>
            <li><strong>Usage-gegevens:</strong> IP-adres, browser-informatie, pagina's bezocht, tijd besteed op het Platform</li>
            <li><strong>Website-instellingen:</strong> Inhoud en instellingen van uw Website</li>
            <li><strong>Communicatie:</strong> E-mails, support-tickets en feedback die u naar ons stuurt</li>
            <li><strong>Tracking:</strong> Cookies en vergelijkbare technologieën voor analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Doeleinden van Verwerking</h2>
          <p className="mb-3">
            We verwerken uw gegevens voor de volgende doeleinden:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Account beheer en authenticatie</li>
            <li>Levering van de website builder en hosting services</li>
            <li>Facturen en betalingsverwerking</li>
            <li>Ondersteuning en klantenservice</li>
            <li>Beveiligingscontrole en fraudepreventie</li>
            <li>Verbetering van het Platform en gebruikerservaring</li>
            <li>Communicatie over servicewijzigingen en updates</li>
            <li>Voldoen aan wettelijke verplichtingen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Rechtgrond voor Verwerking</h2>
          <p className="mb-3">
            We verwerken uw gegevens op grond van:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Contractuitvoering:</strong> Nodig voor levering van onze services</li>
            <li><strong>Wettelijke verplichting:</strong> Voor naleving van wetten en regelgeving</li>
            <li><strong>Gerechtvaardigd belang:</strong> Voor beveiliging, fraudepreventie en serviceverbeteringen</li>
            <li><strong>Toestemming:</strong> Voor marketing communicatie (waar gevraagd)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">5. Bewaartermijnen</h2>
          <p className="mb-3">
            We bewaren uw gegevens niet langer dan nodig:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Accountgegevens:</strong> Zolang het account actief is + 1 jaar na beëindiging</li>
            <li><strong>Betalingsgegevens:</strong> Conform wettelijke vereisten (meestal 7 jaar)</li>
            <li><strong>Logs en analytics:</strong> Tot 12 maanden</li>
            <li><strong>Cookies:</strong> Tot 13 maanden</li>
            <li><strong>Support-communicatie:</strong> Tot 2 jaar na laatste contact</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">6. Delen van Gegevens</h2>
          <p className="mb-3">
            Uw gegevens worden alleen met derden gedeeld wanneer nodig:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>ServiceProviders:</strong> Hosting providers, payment processors, email services</li>
            <li><strong>Wettelijke verplichting:</strong> Wanneer vereist door Nederlandse of EU wetten</li>
            <li><strong>Veiligheidsdiensten:</strong> Bij vermoeden van illegale activiteiten</li>
          </ul>
          <p className="mt-3">
            We delen uw gegevens <strong>nooit</strong> voor commerciële doeleinden met derden zonder uw toestemming.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">7. Beveiliging</h2>
          <p className="mb-3">
            We nemen adequate beveiligingsmaatregelen:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Versleuteling (HTTPS/TLS) voor alle data in transit</li>
            <li>Versleuteling van gevoelige gegevens in opslag</li>
            <li>Firewalls en intrusion detection systemen</li>
            <li>Regelmatige beveiligingsaudits en penetration tests</li>
            <li>Beperkte toegang tot gegevens op basis van 'need-to-know'</li>
            <li>Verplichte beveiligingstraining voor medewerkers</li>
          </ul>
          <p className="mt-3">
            Hoewel we alle voorzorgsmaatregelen treffen, kunnen we geen absolute beveiliging garanderen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">8. Uw Rechten onder de AVG/GDPR</h2>
          <p className="mb-3">
            U hebt de volgende rechten:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Recht op inzage:</strong> Alle gegevens die we over u hebben</li>
            <li><strong>Recht op rectificatie:</strong> Foutieve gegevens corrigeren</li>
            <li><strong>Recht op verwijdering:</strong> Uw gegevens laten verwijderen ("recht op vergetelheid")</li>
            <li><strong>Recht op beperking:</strong> Beperking van dataverwerking</li>
            <li><strong>Recht op portabiliteit:</strong> Uw gegevens in een machineleesbaar formaat</li>
            <li><strong>Recht op bezwaar:</strong> Tegen bepaalde verwerkingen</li>
            <li><strong>Recht op uitleg:</strong> Over geautomatiseerde beslissingen</li>
          </ul>
          <p className="mt-3">
            Om deze rechten uit te oefenen, mail{" "}
            <a href="mailto:privacy@websitebouwer.nl" className="text-[var(--brand-blue)] hover:underline">
              privacy@websitebouwer.nl
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">9. Cookies en Tracking</h2>
          <p className="mb-3">
            We gebruiken:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Essentiële cookies:</strong> Voor authenticatie en sessie</li>
            <li><strong>Analytics cookies:</strong> Voor begrijpen hoe u het Platform gebruikt</li>
            <li><strong>Preference cookies:</strong> Voor onthouden van uw instellingen</li>
          </ul>
          <p className="mt-3">
            U kunt cookies uitschakelen in uw browser, maar dit kan de functionaliteit beperken.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">10. Gegevensdatabeurt en Derde Landen</h2>
          <p className="mb-3">
            Uw gegevens worden normaliter in de EU opgeslagen. Indien we gegevens buiten de EU overbrengen, gebeurt dit met passende waarborgen zoals internationale overeenkomsten.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">11. Contact en Klachten</h2>
          <p className="mb-3">
            Vragen over deze privacyverklaring?
          </p>
          <p className="mb-3">
            E-mail:{" "}
            <a href="mailto:privacy@websitebouwer.nl" className="text-[var(--brand-blue)] hover:underline">
              privacy@websitebouwer.nl
            </a>
          </p>
          <p className="mb-3">
            U kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens (AP) op{" "}
            <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-blue)] hover:underline">
              www.autoriteitpersoonsgegevens.nl
            </a>
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--brand-blue)]/20">
          <h3 className="text-lg font-semibold text-white mb-3">Meer Informatie</h3>
          <p>
            Voor meer informatie over GDPR/AVG, zie{" "}
            <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-blue)] hover:underline">
              autoriteitpersoonsgegevens.nl
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  )
}

