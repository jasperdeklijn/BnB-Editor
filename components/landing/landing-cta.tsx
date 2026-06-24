import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

export function LandingCta() {
  return (
    <section className="bg-[var(--landing-surface)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] bg-[var(--landing-primary)] px-8 py-12 text-center text-white md:px-16 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/75">
            Klaar om te starten?
          </p>
          <h2 className="mx-auto mb-5 max-w-3xl text-balance text-4xl font-bold md:text-5xl">
            Maak je bedrijf online zichtbaar met {PLATFORM_BRAND_NAME}
          </h2>
          <p className="mx-auto mb-9 max-w-2xl text-pretty text-lg leading-relaxed text-white/78">
            Maak een account aan, kies je secties en publiceer een professionele website zonder technische omweg.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-8 py-6 text-base font-bold text-[var(--landing-primary-dark)] hover:bg-[var(--landing-primary-light)]"
            >
              <Link href="/auth/sign-up">Maak een gratis account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/35 bg-transparent px-8 py-6 text-base font-bold text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/auth/login">Ik heb al een account</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-white/65">
            Gratis account. Geen creditcard vereist.
          </p>
        </div>
      </div>
    </section>
  )
}
