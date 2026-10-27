import { ChevronDown } from "lucide-react"
import { PRICING_FAQ } from "@/lib/pricing"

/**
 * Pricing FAQ Section Component
 * Displays frequently asked questions about pricing plans
 */
export function PricingFaq() {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--landing-secondary)]">
          Veelgestelde vragen
        </h2>
        <p className="text-lg text-[var(--landing-muted)]">
          Antwoorden op de meestgestelde vragen over onze prijzen en plannen
        </p>
      </div>

      <div className="w-full space-y-3">
        {PRICING_FAQ.map((faq, index) => (
          <details
            key={`faq-${index}`}
            className="group rounded-2xl border border-[var(--landing-border)] bg-white px-6 py-2 transition-colors open:bg-[var(--landing-primary-light)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-base font-semibold text-[var(--landing-secondary)] transition-colors hover:text-[var(--landing-primary-dark)]">
              {faq.question}
              <ChevronDown className="h-5 w-5 shrink-0 text-[var(--landing-primary)] transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="pb-4 pt-2 text-[var(--landing-muted)]">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
