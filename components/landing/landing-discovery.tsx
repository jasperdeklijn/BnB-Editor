import Link from "next/link"
import { MarketingLinks } from "@/components/marketing/marketing-page"

export function LandingDiscovery() {
  return <section className="bg-white px-6 py-16 sm:py-20" aria-labelledby="audience-title">
    <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
      <div>
        <h2 id="audience-title" className="text-3xl font-bold tracking-tight">Voor wie is FlexPagina?</h2>
        <p className="mt-4 text-lg leading-relaxed text-[var(--landing-muted)]">FlexPagina is een Nederlandse websitebouwer voor zzp&apos;ers en kleine ondernemers. Maak en beheer je bedrijfswebsite online zonder te programmeren: laat je diensten of verblijf zien en help bezoekers contact op te nemen.</p>
        <div className="mt-4"><MarketingLinks paths={["/website-voor-zzp", "/website-voor-bnb", "/website-maken"]} /></div>
      </div>
      <div className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 sm:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Al een website?</h2>
        <p className="mt-4 leading-relaxed text-[var(--landing-muted)]">Bouw eerst je nieuwe website op. Controleer je teksten, foto&apos;s, domein en e-mail voordat je overstapt. Lees wat je zelf moet voorbereiden en wat de beschikbare overzetfunctie kan doen.</p>
        <Link href="/website-overstappen" className="mt-5 inline-flex min-h-11 items-center font-bold text-[var(--landing-primary)] underline underline-offset-4">Zo werkt overstappen</Link>
      </div>
    </div>
  </section>
}
