import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  return (
    <section className="bg-[var(--landing-surface)] px-6 pb-12 pt-32 sm:pt-36" aria-labelledby="hero-title">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
          Voor kleine ondernemers met grote plannen
        </p>
        <h1 id="hero-title" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-[var(--landing-secondary)] sm:text-5xl lg:text-6xl">
          Je website, aanvragen en boekingen. <span className="text-[var(--landing-primary)]">Alles op één plek.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
          Maak zonder technische kennis een professionele bedrijfswebsite en breid eenvoudig uit met aanvragen, boekingen en facturatie.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full bg-[var(--landing-primary)] px-8 py-6 text-base font-bold text-white shadow-[0_10px_24px_rgba(36,56,45,0.18)] hover:bg-[var(--landing-primary-dark)]">
            <Link href="/auth/sign-up">Gratis starten</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-[var(--landing-border)] bg-white px-8 py-6 text-base font-bold text-[var(--landing-secondary)] hover:bg-[var(--landing-primary-light)]">
            <Link href="#voorbeeld">Bekijk demo</Link>
          </Button>
        </div>
        <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--landing-muted)]">
          {["Geen creditcard nodig", "Nederlands platform", "Eigen domein koppelen", "Maandelijks opzegbaar"].map((item) => (
            <li key={item} className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0 text-[var(--landing-primary)]" aria-hidden="true" />{item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
