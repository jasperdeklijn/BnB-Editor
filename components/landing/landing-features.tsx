import { Brush, CloudUpload, Images, LayoutTemplate, MousePointer2, ShieldCheck } from "lucide-react"
import type { CSSProperties } from "react"

const features = [
  {
    title: "Visuele editor",
    description: "Pas tekst, afbeeldingen en secties direct aan zonder code of technische stappen.",
    icon: MousePointer2,
  },
  {
    title: "Kant-en-klare secties",
    description: "Start met duidelijke blokken voor diensten, galerijen, contact, prijzen en veelgestelde vragen.",
    icon: LayoutTemplate,
  },
  {
    title: "Eigen stijl",
    description: "Stel kleuren, lettertypen en onderdelen af op de uitstraling van jouw bedrijf.",
    icon: Brush,
  },
  {
    title: "Afbeeldingen beheren",
    description: "Upload foto's en gebruik ze opnieuw vanuit een overzichtelijke mediabibliotheek.",
    icon: Images,
  },
  {
    title: "Direct publiceren",
    description: "Zet wijzigingen online zodra ze klaar zijn, zonder extra overdracht of wachttijd.",
    icon: CloudUpload,
  },
  {
    title: "Veilig online",
    description: "Gebouwd op moderne hosting en database-infrastructuur, klaar voor dagelijks gebruik.",
    icon: ShieldCheck,
  },
]

const featureStyles = [
  "bg-[var(--landing-primary-light)] text-[var(--landing-primary-dark)]",
  "bg-[var(--landing-gold-light)] text-[#8a6418]",
  "bg-[var(--landing-sage)] text-[var(--landing-primary-dark)]",
]

export function LandingFeatures() {
  return (
    <section id="functies" className="relative overflow-hidden bg-[var(--landing-surface)] px-6 py-24">
      <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-[var(--landing-sage)]/55 blur-3xl" aria-hidden="true" />
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
            Functionaliteiten
          </p>
          <h2 className="text-balance text-4xl font-bold text-[var(--landing-secondary)] md:text-5xl">
            Alles om je website overzichtelijk te beheren
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
            Een gerichte set tools voor kleine bedrijven: praktisch, snel te begrijpen en makkelijk bij te houden.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon

            return (
              <article
                key={feature.title}
                className="relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-white p-7 shadow-[0_16px_40px_rgba(31,41,51,0.06)] transition-all before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[var(--card-accent)] hover:-translate-y-1 hover:border-[var(--landing-primary)]"
                style={{
                  "--card-accent": index % 3 === 1 ? "var(--landing-gold)" : "var(--landing-accent)",
                } as CSSProperties}
              >
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${featureStyles[index % featureStyles.length]}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--landing-secondary)]">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--landing-muted)]">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
