import { BOOKING_ADDON_NAME, BOOKING_ADDON_FEATURES, BOOKING_ADDON_MONTHLY_PRICE, MULTILINGUAL_ADDON_MONTHLY_PRICE, formatPrice } from "@/lib/pricing"

export function PricingAddons() {
  return (
    <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
      <div className="rounded-2xl border border-[var(--landing-border)] bg-white p-6">
        <h3 className="font-bold text-[var(--landing-secondary)]">{BOOKING_ADDON_NAME}</h3>
        <p className="mt-2 text-xl font-bold text-[var(--landing-primary-dark)]">+ {formatPrice(BOOKING_ADDON_MONTHLY_PRICE)}/maand</p>
        <p className="mt-2 text-sm text-[var(--landing-muted)]">Beschikbaar bij Bronze, Silver en Gold.</p>
        <ul className="mt-4 grid gap-2 text-sm text-[var(--landing-secondary)] sm:grid-cols-2">
          {BOOKING_ADDON_FEATURES.map((feature) => <li key={feature}>✓ {feature}</li>)}
        </ul>
      </div>
      <div className="rounded-2xl border border-[var(--landing-border)] bg-white p-6">
        <h3 className="font-bold text-[var(--landing-secondary)]">Meertaligheid</h3>
        <p className="mt-2 text-xl font-bold text-[var(--landing-primary-dark)]">+ {formatPrice(MULTILINGUAL_ADDON_MONTHLY_PRICE)}/maand</p>
        <p className="mt-2 text-sm text-[var(--landing-muted)]">Bij Bronze en Silver. Meertaligheid is inbegrepen bij Gold.</p>
      </div>
      <p className="text-center text-xs text-[var(--landing-muted)] sm:col-span-2">Alle add-onprijzen zijn exclusief btw.</p>
    </div>
  )
}
