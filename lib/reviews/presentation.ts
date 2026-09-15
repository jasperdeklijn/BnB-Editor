export const REVIEW_FORM_FIELDS = [
  { key: "reviewFormTitle", label: "Formuliertitel", defaultValue: "Deel je ervaring", maxLength: 120 },
  { key: "reviewFormIntro", label: "Introductie formulier", defaultValue: "Hoe heb je onze dienstverlening ervaren? Laat een recensie achter.", maxLength: 500 },
  { key: "reviewNameLabel", label: "Label naam", defaultValue: "Naam bij je recensie", maxLength: 80 },
  { key: "reviewEmailLabel", label: "Label e-mailadres", defaultValue: "E-mailadres (blijft privé)", maxLength: 80 },
  { key: "reviewRatingLabel", label: "Label beoordeling", defaultValue: "Jouw beoordeling", maxLength: 80 },
  { key: "reviewBodyLabel", label: "Label ervaring", defaultValue: "Je ervaring", maxLength: 80 },
  { key: "reviewSubmitLabel", label: "Knoptekst versturen", defaultValue: "Recensie versturen", maxLength: 80 },
  { key: "reviewEmptyText", label: "Tekst zonder recensies", defaultValue: "Nog geen recensies. Deel als eerste je ervaring.", maxLength: 300 },
] as const
export type ReviewFormSettings = Record<(typeof REVIEW_FORM_FIELDS)[number]["key"], string>
export function getReviewFormSettings(data: Record<string, unknown> = {}): ReviewFormSettings {
  return Object.fromEntries(REVIEW_FORM_FIELDS.map(({ key, defaultValue, maxLength }) => [
    key, typeof data[key] === "string" && data[key].trim() ? data[key].trim().slice(0, maxLength) : defaultValue,
  ])) as ReviewFormSettings
}
export function getReviewPanelClass(styleType: unknown): string {
  const base = "min-w-0 border p-5 sm:p-6"
  switch (styleType) {
    case "bold": return `${base} rounded-lg border-current/30 bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-md [&_h2]:font-extrabold`
    case "elegant": return `${base} rounded-sm border-current/20 bg-[var(--section-surface)] text-[var(--section-surface-foreground)] [&_h2]:font-serif`
    case "soft": return `${base} rounded-3xl border-transparent bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-sm`
    case "dark": return `${base} rounded-2xl border-slate-700 bg-slate-950 text-white`
    case "outline": return `${base} rounded-xl border-2 border-current/30 bg-transparent text-inherit`
    default: return `${base} rounded-xl border-current/15 bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-sm`
  }
}

export function getPublishedReviewPresentation(snapshot: unknown) {
  const record = snapshot && typeof snapshot === "object" ? snapshot as Record<string, unknown> : {}
  const sections = Array.isArray(record.sections) ? record.sections : []
  const section = sections.find((value) => value?.type === "testimonials" && value?.data?.reviewMode === "collection")
  const source = section?.data ?? {}
  const styles: SectionStyles = {}
  for (const key of ["backgroundColor", "textColor", "accentColor", "surfaceColor", "fontFamily"] as const) {
    if (typeof section?.styles?.[key] === "string") styles[key] = section.styles[key]
  }
  return { data: { ...getReviewFormSettings(source), layout: typeof source.layout === "string" ? source.layout : "classic", styleType: typeof source.styleType === "string" ? source.styleType : "clean" }, styles }
}
import type { SectionStyles } from "@/lib/types"
