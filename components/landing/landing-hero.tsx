import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLATFORM_EMAILS } from "@/lib/platform"
import { MARKETING_ACCESS_NOTICE } from "@/lib/marketing"

export function LandingHero() {
  return (
    <section className="bg-[var(--landing-surface)] px-6 pb-12 pt-32 sm:pt-36" aria-labelledby="hero-title">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--landing-primary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--landing-primary)]" aria-hidden="true" />
          FlexPagina · Testversie
        </p>
        <h1 id="hero-title" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-[var(--landing-secondary)] sm:text-5xl lg:text-6xl">
          Je website, aanvragen en boekingen. <span className="text-[var(--landing-primary)]">Alles op één plek.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
          Maak zonder technische kennis een website voor je bedrijf en koppel je eigen domein. Ontdek in de testversie de mogelijkheden voor aanvragen en de optionele uitbreiding Booking &amp; Facturatie.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full bg-[var(--landing-primary)] px-8 py-6 text-base font-bold text-white shadow-[0_10px_24px_rgba(36,56,45,0.18)] hover:bg-[var(--landing-primary-dark)]">
            <Link href="/auth/sign-up">Testversie proberen</Link>
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
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[var(--landing-border)] bg-white px-5 py-4 text-sm leading-relaxed text-[var(--landing-muted)]">
          <p className="mb-3 font-semibold text-[var(--landing-primary-dark)]">{MARKETING_ACCESS_NOTICE}</p>
          <p className="font-semibold text-[var(--landing-secondary)]">Help FlexPagina beter te maken</p>
          <p className="mt-1">
            FlexPagina is in ontwikkeling. Functies en vormgeving kunnen tijdens de testfase veranderen.
            Heb je een idee of werkt iets niet?{" "}
            <a href={`mailto:${PLATFORM_EMAILS.support}?subject=Feedback%20testversie%20FlexPagina`} className="font-semibold text-[var(--landing-primary)] underline underline-offset-4 hover:text-[var(--landing-primary-dark)]">
              Deel je feedback
            </a>.
          </p>
        </div>
      </div>
    </section>
  )
}
