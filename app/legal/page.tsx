import { SharedHeader } from "@/components/layout/shared-header"
import { SharedFooter } from "@/components/layout/shared-footer"
import Link from "next/link"

export const metadata = {
  title: "Juridisch | BnB Website Maken",
  description: "Juridische informatie en documentatie",
}

export default function LegalIndexPage() {
  const legalPages = [
    {
      title: "Algemene Voorwaarden",
      description: "Onze algemene voorwaarden en serviceagreement",
      href: "/legal/terms",
      icon: "📋"
    },
    {
      title: "Privacyverklaring",
      description: "Hoe we uw persoonsgegevens verwerken",
      href: "/legal/privacy",
      icon: "🔒"
    },
    {
      title: "Acceptable Use Policy",
      description: "Regels voor het gebruik van het platform",
      href: "/legal/aup",
      icon: "⚠️"
    },
    {
      title: "Notice & Takedown",
      description: "Procedure voor het melden van illegale content",
      href: "/legal/takedown",
      icon: "🚨"
    },
    {
      title: "Disclaimer",
      description: "Aansprakelijkheidsbeperkingen",
      href: "/legal/disclaimer",
      icon: "⚖️"
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[var(--hero-bg)]">
      <SharedHeader title="Juridisch" />

      <main className="flex-1 mx-auto max-w-6xl px-6 py-12 w-full">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Juridische Documenten</h1>
          <p className="text-white/70 max-w-2xl">
            Lees onze juridische documenten en richtlijnen. Bij vragen over privacy, voorwaarden of misbruik, 
            kunt u altijd contact met ons opnemen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {legalPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group bg-white/5 hover:bg-white/10 border border-[var(--brand-blue)]/20 hover:border-[var(--brand-blue)]/40 rounded-lg p-6 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{page.icon}</div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-[var(--brand-blue)] transition-colors">
                {page.title}
              </h2>
              <p className="text-white/60">
                {page.description}
              </p>
              <div className="mt-4 flex items-center text-[var(--brand-blue)] opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Lees meer</span>
                <span className="ml-2">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white/5 border border-[var(--brand-blue)]/20 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Veel gestelde vragen</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Bent u verantwoordelijk voor content van gebruikers?</h3>
              <p className="text-white/70">
                Nee. BnB Website Maken biedt alleen technische hosting. Gebruikers zijn volledig verantwoordelijk 
                voor hun eigen content. Zie onze Disclaimer voor meer informatie.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Hoe meld ik illegale content?</h3>
              <p className="text-white/70">
                Stuur een e-mail naar{" "}
                <a href="mailto:abuse@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline">
                  abuse@bnbwebsitemaken.nl
                </a>
                {" "}met details van de content. Zie onze Notice & Takedown procedure.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Hoe kan ik mijn privacy-gegevens inzien?</h3>
              <p className="text-white/70">
                Stuur een verzoek naar{" "}
                <a href="mailto:privacy@bnbwebsitemaken.nl" className="text-[var(--brand-blue)] hover:underline">
                  privacy@bnbwebsitemaken.nl
                </a>
                {" "}met uw identiteitskaart. We reageren binnen 30 dagen.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Wat zijn jullie contactgegevens?</h3>
              <p className="text-white/70">
                <strong>Support:</strong> support@bnbwebsitemaken.nl<br/>
                <strong>Privacy:</strong> privacy@bnbwebsitemaken.nl<br/>
                <strong>Abuse/Takedown:</strong> abuse@bnbwebsitemaken.nl
              </p>
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  )
}
