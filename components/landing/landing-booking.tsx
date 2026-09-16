import Link from "next/link"
import { CalendarCheck, LayoutDashboard, FilePlus2, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BOOKING_ADDON_MONTHLY_PRICE, BOOKING_ADDON_NAME, formatPrice } from "@/lib/pricing"

const steps = [
  { title: "Klant boekt", text: "Je klant kiest een beschikbaar moment op je website.", icon: CalendarCheck },
  { title: "Jij houdt overzicht", text: "De boeking en klantgegevens staan in je dashboard.", icon: LayoutDashboard },
  { title: "Maak een factuur", text: "Neem de gegevens uit de boeking over en controleer de factuur.", icon: FilePlus2 },
  { title: "Download de PDF", text: "Download de factuur en verstuur deze naar je klant.", icon: FileDown },
]

export function LandingBooking() {
  return (
    <section id="booking-facturatie" className="scroll-mt-24 bg-white px-6 py-20 sm:py-24" aria-labelledby="booking-title">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">{BOOKING_ADDON_NAME}</p>
            <h2 id="booking-title" className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl">Van reservering naar factuur, zonder dubbel invoerwerk.</h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--landing-muted)]">Beschikbaarheid, boekingen, automatische bevestigingen en facturen in één omgeving. Zo hoef je dezelfde klantgegevens niet steeds opnieuw in te vullen.</p>
          </div>
          <div className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-primary-light)] p-6 lg:max-w-xs">
            <p className="text-sm font-semibold">Breid elk websitepakket uit</p>
            <p className="mt-3 text-3xl font-bold text-[var(--landing-primary)]">+ {formatPrice(BOOKING_ADDON_MONTHLY_PRICE)}<span className="text-sm font-normal"> /maand</span></p>
            <p className="mt-2 text-sm text-[var(--landing-muted)]">Exclusief btw. Bij Bronze, Silver en Gold.</p>
            <Button asChild className="mt-5 w-full rounded-full bg-[var(--landing-primary)] text-white hover:bg-[var(--landing-primary-dark)]"><Link href="/auth/sign-up">Gratis starten</Link></Button>
          </div>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ title, text, icon: Icon }, index) => (
            <li key={title} className="border-t border-[var(--landing-border)] pt-6">
              <div className="mb-4 flex items-center gap-3 text-[var(--landing-primary)]"><span className="text-sm font-bold">0{index + 1}</span><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
