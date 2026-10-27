import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"
import { MARKETING_ACCESS_NOTICE } from "@/lib/marketing"

export function LandingCta() {
  return (
    <section className="bg-[var(--landing-surface)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] bg-[var(--landing-primary)] px-8 py-12 text-center text-white md:px-16 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/75">
            Bouw mee aan FlexPagina
          </p>
          <h2 className="mx-auto mb-5 max-w-3xl text-balance text-4xl font-bold md:text-5xl">
            Probeer de testversie en help ons verbeteren
          </h2>
          <p className="mx-auto mb-9 max-w-2xl text-pretty text-lg leading-relaxed text-white/78">
            Maak gratis een account bij {PLATFORM_BRAND_NAME} en ontdek de editor. Jouw feedback helpt ons het platform verder te verbeteren. Geen creditcard nodig.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-8 py-6 text-base font-bold text-[var(--landing-primary-dark)] hover:bg-[var(--landing-primary-light)]"
            >
              <Link href="/auth/sign-up">Testversie proberen</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-white/65">
            {MARKETING_ACCESS_NOTICE}
          </p>
        </div>
      </div>
    </section>
  )
}
