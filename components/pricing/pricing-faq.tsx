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
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          Veelgestelde vragen
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Antwoorden op de meestgestelde vragen over onze prijzen en plannen
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-3">
        {PRICING_FAQ.map((faq, index) => (
          <AccordionItem
            key={`faq-${index}`}
            value={`faq-${index}`}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-6 py-2 data-[state=open]:bg-slate-50 dark:data-[state=open]:bg-slate-900/50 transition-colors"
          >
            <AccordionTrigger className="py-4 text-base font-semibold text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 dark:text-slate-400 pt-2 pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
