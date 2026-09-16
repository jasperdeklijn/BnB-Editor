import { Coins, PanelsTopLeft, PencilRuler } from "lucide-react"
import { formatPrice, PRICING_PLANS } from "@/lib/pricing"

const reasons = [
  { title: "Zelf aanpassen, zonder techniek", description: "Werk met kant-en-klare onderdelen. Teksten, foto's en kleuren pas je zelf aan in de visuele editor.", icon: PencilRuler },
  { title: "Klein beginnen, gericht uitbreiden", description: `Je websitepakket begint bij ${formatPrice(PRICING_PLANS.bronze.monthlyPrice)} per maand exclusief btw. Kies extra functies als je ze nodig hebt.`, icon: Coins },
  { title: "Je website en werk bij elkaar", description: "Beheer je website en aanvragen in dezelfde omgeving. Met Booking & Facturatie komen daar je boekingen en facturen bij.", icon: PanelsTopLeft },
]

export function LandingTrust() {
  return (
    <section id="waarom-flexpagina" className="scroll-mt-24 bg-[var(--landing-primary-dark)] px-6 py-20 text-white sm:py-24" aria-labelledby="trust-title">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/75">Waarom FlexPagina?</p>
          <h2 id="trust-title" className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl">Gemaakt voor de ondernemer die het zelf wil kunnen.</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80">FlexPagina is een Nederlands platform voor kleine ondernemers. Van B&B tot kapper en coach: je wilt een goede website én tijd overhouden voor je klanten.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {reasons.map(({ title, description, icon: Icon }) => (
            <article key={title} className="border-t border-white/20 pt-6">
              <Icon className="mb-5 h-6 w-6 text-white/80" aria-hidden="true" />
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/80">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
