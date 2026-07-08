"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

      <Accordion type="single" collapsible className="w-full space-y-3">
        {PRICING_FAQ.map((faq, index) => (
          <AccordionItem
            key={`faq-${index}`}
            value={`faq-${index}`}
            className="rounded-2xl border border-[var(--landing-border)] bg-white px-6 py-2 transition-colors data-[state=open]:bg-[var(--landing-primary-light)]"
          >
            <AccordionTrigger className="py-4 text-left text-base font-semibold text-[var(--landing-secondary)] transition-colors hover:text-[var(--landing-primary-dark)]">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 text-[var(--landing-muted)]">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
