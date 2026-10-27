import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { MARKETING_DEMOS } from "@/lib/marketing-demos"

export function ExampleCards({ slugs, showAudienceLinks = false }: { slugs?: string[]; showAudienceLinks?: boolean }) {
  const demos = MARKETING_DEMOS.filter(demo => !slugs || slugs.includes(demo.slug))
  return <div className={`grid gap-6 ${demos.length === 1 ? "max-w-xl" : demos.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
    {demos.map(demo => <article key={demo.slug} className="overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-white transition-shadow hover:shadow-lg">
      <Link href={`/voorbeelden/${demo.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--landing-primary)]">
        <div className="border-b border-[var(--landing-border)] p-4" style={{ backgroundColor: demo.background }}>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <p className="px-4 py-3 text-xs font-bold" style={{ color: demo.accent }}>{demo.name}</p>
            <Image src={demo.image} alt={`Illustratie voor de fictieve voorbeeldwebsite ${demo.name}`} width={720} height={480} className="aspect-[3/2] w-full object-cover" />
            <p className="px-4 py-5 font-serif text-xl font-semibold" style={{ color: demo.accent }}>{demo.title}</p>
          </div>
        </div>
        <div className="p-6">
          <p className="mb-2 text-xs font-semibold text-[var(--landing-muted)]">Fictief voorbeeld · {demo.name}</p>
          <h3 className="flex items-center justify-between gap-3 text-xl font-bold text-[var(--landing-secondary)]">{demo.category}<ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--landing-primary)]" aria-hidden="true" /></h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)]">{demo.description}</p>
          <p className="mt-5 text-sm font-bold text-[var(--landing-primary)]">Bekijk demo <span className="sr-only">voor {demo.category}</span></p>
        </div>
      </Link>
      {showAudienceLinks ? <div className="border-t border-[var(--landing-border)] px-6 py-3"><Link href={demo.slug === "bnb" ? "/website-voor-bnb" : "/website-voor-zzp"} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--landing-primary)] underline underline-offset-4">{demo.slug === "bnb" ? "Een website voor jouw B&B" : "Een website voor jouw bedrijf"}</Link></div> : null}
    </article>)}
  </div>
}

export function LandingExamples() {
  return (
    <section id="voorbeelden" className="scroll-mt-24 bg-[var(--landing-surface)] px-6 py-20 sm:py-24" aria-labelledby="examples-title">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">Voor B&B&apos;s, zzp&apos;ers en kleine dienstverleners</p>
          <h2 id="examples-title" className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl">Zo kan jouw website eruitzien.</h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--landing-muted)]">Gemaakt voor kleine ondernemers die zelf hun website willen beheren. Bekijk drie voorbeeldsites, gebouwd met onderdelen uit de FlexPagina-editor.</p>
        </div>
        <ExampleCards />
        <p className="mt-5 text-sm text-[var(--landing-muted)]">Dit zijn fictieve voorbeeldbedrijven, geen klantcases. Je kunt de websites vrij bekijken; aanvragen en boekingen zijn uitgeschakeld.</p>
        <Link href="/voorbeelden" className="mt-4 inline-flex min-h-11 items-center font-semibold text-[var(--landing-primary)] underline underline-offset-4">Bekijk alle voorbeeldwebsites</Link>
      </div>
    </section>
  )
}
