import { CheckCircle2, Globe2, LockKeyhole, PencilRuler } from "lucide-react"

const trustPoints = [
  {
    title: "Alles zelf aanpassen",
    description: "Wijzig tekst, afbeeldingen, kleuren en secties zonder voor iedere aanpassing hulp in te schakelen.",
    icon: PencilRuler,
  },
  {
    title: "Eigen webadres mogelijk",
    description: "Koppel een eigen domeinnaam wanneer je klaar bent om professioneel naar buiten te treden.",
    icon: Globe2,
  },
  {
    title: "Veilige basis",
    description: "Moderne hosting, beveiligde accounts en duidelijke privacy- en juridische informatie.",
    icon: LockKeyhole,
  },
]

export function LandingTrust() {
  return (
    <section className="bg-[var(--landing-primary-dark)] px-6 py-24 text-white" aria-labelledby="trust-title">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-gold)]">
              Duidelijk en betrouwbaar
            </p>
            <h2 id="trust-title" className="text-balance text-4xl font-bold md:text-5xl">
              Jij houdt de controle over je bedrijfswebsite
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              Begin klein, publiceer wanneer jij tevreden bent en breid de website uit als je bedrijf groeit.
              Je ziet vooraf wat ieder abonnement bevat.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm text-white/80">
              {["Geen code nodig", "Geen creditcard vereist", "Maandelijks aanpasbaar"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--landing-gold)]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {trustPoints.map(({ title, description, icon: Icon }, index) => (
              <article
                key={title}
                className={`rounded-3xl border p-6 ${
                  index === 1
                    ? "border-[var(--landing-gold)]/45 bg-[var(--landing-gold)]/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className="h-5 w-5 text-[var(--landing-gold)]" aria-hidden="true" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
