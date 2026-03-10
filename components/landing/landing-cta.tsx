import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section className="relative bg-[var(--surface-dim)] px-6 py-24 overflow-hidden">
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="grid items-center gap-10 rounded-3xl border border-[var(--brand-blue)]/20 bg-[var(--hero-bg)] p-8 shadow-xl shadow-[var(--brand-purple)]/5 md:grid-cols-2 md:p-12">
          {/* Image side */}
          <div className="overflow-hidden rounded-2xl border border-[var(--brand-blue)]/20">
            <Image
              src="/placeholder.svg?height=400&width=500"
              alt="Voorbeeld van een professionele B&B website gemaakt met BnB Website Maken"
              width={500}
              height={400}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Text side */}
          <div className="text-center md:text-left">
            {/* Demo badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-purple)]/30 bg-[var(--brand-purple)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-purple)]">
              Professioneel
            </div>
            <h2 className="mb-4 text-balance text-4xl font-bold text-white">
              Klaar om jouw B&B website te{" "}
              <span className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] bg-clip-text text-transparent">
                maken
              </span>
              ?
            </h2>
            <p className="mb-8 text-pretty text-lg leading-relaxed text-white/55">
              Maak een account aan en begin direct met het ontwerpen van jouw professionele B&B website.
              Kies uit kant-en-klare secties, upload je eigen foto's en publiceer binnen minuten.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row md:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white hover:opacity-90 px-8 py-6 text-base"
              >
                <Link href="/auth/sign-up">Maak een gratis account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 px-8 py-6 text-base"
              >
                <Link href="/auth/login">Ik heb al een account</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-white/25">
              Gratis account — geen creditcard vereist.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
