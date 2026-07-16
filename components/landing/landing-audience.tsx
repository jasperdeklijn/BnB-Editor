import { BriefcaseBusiness, CalendarDays, Hammer, Home, Scissors, Store } from "lucide-react"

const audiences = [
  {
    title: "Vakmensen",
    description: "Laat diensten, afgeronde projecten en contactmogelijkheden duidelijk zien.",
    icon: Hammer,
  },
  {
    title: "Salons en studio's",
    description: "Presenteer behandelingen, prijzen, openingstijden en je eigen uitstraling.",
    icon: Scissors,
  },
  {
    title: "Verblijven en B&B's",
    description: "Combineer sfeerbeelden, kamers, voorzieningen en aanvragen op één website.",
    icon: Home,
  },
  {
    title: "Adviseurs",
    description: "Bouw vertrouwen op met expertise, diensten, werkwijze en een heldere contactroute.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Lokale winkels",
    description: "Maak assortiment, locatie, openingstijden en acties online vindbaar.",
    icon: Store,
  },
  {
    title: "Dienstverleners",
    description: "Zet je aanbod professioneel online en breid later uit met aanvragen of afspraken.",
    icon: CalendarDays,
  },
]

export function LandingAudience() {
  return (
    <section className="bg-white px-6 py-24" aria-labelledby="audience-title">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
              Voor kleine ondernemers
            </p>
            <h2 id="audience-title" className="text-balance text-4xl font-bold text-[var(--landing-secondary)] md:text-5xl">
              Een websitebouwer die past bij jouw dagelijkse praktijk
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
              Je hoeft geen webdesigner of programmeur te zijn. FlexPagina.nl helpt zelfstandigen en
              kleine bedrijven een professionele bedrijfswebsite te maken en zelf actueel te houden.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {audiences.map(({ title, description, icon: Icon }, index) => (
              <article
                key={title}
                className={`rounded-3xl border p-6 ${
                  index % 3 === 1
                    ? "border-[#ead9ae] bg-[var(--landing-gold-light)]"
                    : "border-[var(--landing-border)] bg-[var(--landing-surface)]"
                }`}
              >
                <Icon className="mb-4 h-6 w-6 text-[var(--landing-primary)]" aria-hidden="true" />
                <h3 className="text-lg font-bold text-[var(--landing-secondary)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
