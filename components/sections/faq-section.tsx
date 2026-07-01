"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

export interface FaqItem {
  id?: string
  question: string
  answer: string
}

interface FaqSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: "1",
    question: "Hoe snel kan ik terecht?",
    answer:
      "In de meeste gevallen kunnen we binnen 1–3 werkdagen bij u terecht. Neem contact op voor een exacte planning.",
  },
  {
    id: "2",
    question: "Wat zijn de kosten?",
    answer:
      "De kosten zijn afhankelijk van het type dienst en de omvang van het werk. We brengen graag een vrijblijvende offerte uit.",
  },
  {
    id: "3",
    question: "Werken jullie met garantie?",
    answer:
      "Ja, op al ons werk geven wij garantie. De exacte voorwaarden bespreken we bij de opdrachtbevestiging.",
  },
  {
    id: "4",
    question: "Hoe kan ik een afspraak maken?",
    answer:
      "U kunt ons bellen, mailen of het contactformulier op deze pagina gebruiken. We reageren zo snel mogelijk.",
  },
]

function FaqRow({
  item,
  data,
  index,
  isPreview,
  onUpdate,
  textStyle,
}: {
  item: FaqItem
  data: Record<string, unknown>
  index: number
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  textStyle?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <EditableText data={data} path={["items", index, "question"]} value={item.question} isPreview={isPreview} onUpdate={onUpdate} className="text-sm font-medium md:text-base" style={textStyle} />
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-amber-600 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <EditableText
          as="p"
          data={data}
          path={["items", index, "answer"]}
          value={item.answer}
          isPreview={isPreview}
          onUpdate={onUpdate}
          multiline
          className="pb-5 text-sm leading-relaxed text-muted-foreground"
          style={textStyle}
        />
      )}
    </div>
  )
}

export function FaqSection({ data, isPreview, styles, onUpdate }: FaqSectionProps) {
  const title = (data.title as string) || "Veelgestelde vragen"
  const subtitle = data.subtitle as string | undefined
  const items: FaqItem[] =
    Array.isArray(data.items) && (data.items as FaqItem[]).length > 0
      ? (data.items as FaqItem[])
      : DEFAULT_FAQS
  const editableData =
    Array.isArray(data.items) && (data.items as FaqItem[]).length > 0
      ? data
      : { ...data, items }
  const layout = getLayoutClasses(data.layout)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section
      className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className={`mx-auto ${layout.container}`}>
        <div className={`mb-12 ${layout.heading}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            FAQ
          </p>
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-3 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          />
          {subtitle && (
            <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} className="text-muted-foreground" style={textStyle} multiline />
          )}
        </div>

        <div className={`${layout.layout === "split" ? "columns-1 md:columns-2 md:gap-6" : ""} rounded-2xl border border-border bg-white/70 px-6 shadow-sm backdrop-blur`}>
          {items.map((item, idx) => (
            <FaqRow key={item.id ?? idx} item={item} data={editableData} index={idx} isPreview={isPreview} onUpdate={onUpdate} textStyle={textStyle} />
          ))}
        </div>
      </div>
    </section>
  )
}
