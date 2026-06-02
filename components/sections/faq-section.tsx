"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

export interface FaqItem {
  question: string
  answer: string
}

interface FaqSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

function FaqAccordion({ items, textColor }: { items: FaqItem[]; textColor?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-white/80 shadow-sm backdrop-blur">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-accent/40"
              aria-expanded={isOpen}
            >
              <span
                className="text-sm font-semibold sm:text-base"
                style={textColor ? { color: textColor } : undefined}
              >
                {item.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-amber-600 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-5">
                <p
                  className="text-sm leading-relaxed text-muted-foreground"
                  style={textColor ? { color: textColor } : undefined}
                >
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function FaqSection({ data, styles }: FaqSectionProps) {
  const title = (data.title as string) || "Veelgestelde vragen"
  const subtitle = (data.subtitle as string) || ""
  const items: FaqItem[] = (data.items as FaqItem[]) || DEFAULT_FAQ_ITEMS
  const layout = (data.layout as string) || "single"

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: styles?.fontFamily,
  }

  return (
    <section className="px-4 py-16 sm:px-6 md:py-24" style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            FAQ
          </p>
          <h2
            className="text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={styles?.textColor ? { color: styles.textColor } : undefined}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="mt-3 text-muted-foreground"
              style={styles?.textColor ? { color: styles.textColor } : undefined}
            >
              {subtitle}
            </p>
          )}
        </div>

        {layout === "two-col" ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))].map(
              (col, ci) => (
                <FaqAccordion key={ci} items={col} textColor={styles?.textColor} />
              )
            )}
          </div>
        ) : (
          <FaqAccordion items={items} textColor={styles?.textColor} />
        )}
      </div>
    </section>
  )
}

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    question: "Hoe kan ik een afspraak maken?",
    answer:
      "Je kunt een afspraak maken via het contactformulier op deze pagina, telefonisch, of via WhatsApp. We reageren binnen 24 uur.",
  },
  {
    question: "Wat zijn jullie openingstijden?",
    answer:
      "We zijn maandag t/m vrijdag bereikbaar van 9:00 tot 17:30. Op zaterdag zijn we alleen op afspraak beschikbaar.",
  },
  {
    question: "Hoe snel kan ik terecht?",
    answer:
      "We streven ernaar om je zo snel mogelijk te helpen. Gemiddeld kun je binnen een week bij ons terecht. Voor spoedgevallen neem je het best telefonisch contact op.",
  },
  {
    question: "Wat zijn de kosten?",
    answer:
      "De kosten zijn afhankelijk van de dienst en de situatie. We geven altijd een duidelijke offerte vooraf, zodat je nooit voor verrassingen staat.",
  },
  {
    question: "Is er een garantie op het werk?",
    answer:
      "Ja, wij staan achter de kwaliteit van ons werk. Als je niet tevreden bent, lossen we dit kosteloos op. Neem contact op voor onze garantievoorwaarden.",
  },
]
