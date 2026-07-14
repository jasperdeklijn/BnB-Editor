import type { SectionType } from "@/lib/types"

export type SectionLayout = "classic" | "split" | "showcase" | "compact" | "card" | "banner"

export interface SectionLayoutOption {
  value: SectionLayout
  label: string
  description: string
}

export const SECTION_LAYOUT_OPTIONS: SectionLayoutOption[] = [
  { value: "classic", label: "Klassiek", description: "Gebalanceerde standaardweergave" },
  { value: "split", label: "Gesplitst", description: "Content verdeeld in twee zones" },
  { value: "showcase", label: "Showcase", description: "Grote visuele presentatie" },
  { value: "compact", label: "Compact", description: "Minder ruimte, sneller scanbaar" },
  { value: "card", label: "Kaart", description: "Content in duidelijke kaarten" },
  { value: "banner", label: "Banner", description: "Brede, opvallende sectie" },
]

const sectionLayoutLabels: Partial<Record<SectionType, Record<SectionLayout, string>>> = {
  hero: {
    classic: "Centered hero",
    split: "Image left",
    showcase: "Full image",
    compact: "Minimal hero",
    card: "Text card",
    banner: "Image right",
  },
  services: {
    classic: "Service grid",
    split: "Service list",
    showcase: "Featured service",
    compact: "Compact list",
    card: "Magazine cards",
    banner: "Carousel",
  },
  gallery: {
    classic: "Image grid",
    split: "Side gallery",
    showcase: "Full slider",
    compact: "Image rail",
    card: "Main image",
    banner: "Masonry",
  },
  contact: {
    classic: "Info + form",
    split: "Split panel",
    showcase: "Contact hero",
    compact: "Compact form",
    card: "Contact card",
    banner: "Contact cards",
  },
  cta: {
    classic: "Centered CTA",
    split: "Text + buttons",
    showcase: "CTA banner",
    compact: "Compact CTA",
    card: "CTA card",
    banner: "Wide CTA",
  },
  features: {
    classic: "Feature grid",
    split: "Two columns",
    showcase: "Large cards",
    compact: "Compact list",
    card: "Feature cards",
    banner: "Feature band",
  },
  about: {
    classic: "Text block",
    split: "Two columns",
    showcase: "Large intro",
    compact: "Compact text",
    card: "Info card",
    banner: "Intro band",
  },
  testimonials: {
    classic: "Review grid",
    split: "Two columns",
    showcase: "Large reviews",
    compact: "Compact reviews",
    card: "Review cards",
    banner: "Review band",
  },
  faq: {
    classic: "FAQ list",
    split: "Two columns",
    showcase: "Wide FAQ",
    compact: "Compact FAQ",
    card: "FAQ card",
    banner: "FAQ band",
  },
  opening_hours: {
    classic: "Hours card",
    split: "Two columns",
    showcase: "Wide hours",
    compact: "Compact hours",
    card: "Hours card",
    banner: "Hours band",
  },
  pricing: {
    classic: "Pricing grid",
    split: "Two columns",
    showcase: "Featured prices",
    compact: "Compact prices",
    card: "Price cards",
    banner: "Price band",
  },
  team: {
    classic: "Teamraster",
    split: "Team met introductie",
    showcase: "Grote portretten",
    compact: "Compacte teamlijst",
    card: "Teamkaarten",
    banner: "Horizontale teamrij",
  },
  map: {
    classic: "Map + info",
    split: "Split map",
    showcase: "Wide map",
    compact: "Compact map",
    card: "Map card",
    banner: "Location band",
  },
  request_form: {
    classic: "Form card",
    split: "Text + form",
    showcase: "Large form",
    compact: "Compact form",
    card: "Request card",
    banner: "Request band",
  },
  nav: {
    classic: "Standard nav",
    split: "Left nav",
    showcase: "Spacious nav",
    compact: "Compact nav",
    card: "Contained nav",
    banner: "Centered nav",
  },
  footer: {
    classic: "Footer columns",
    split: "Reversed footer",
    showcase: "Large footer",
    compact: "Compact footer",
    card: "Footer blocks",
    banner: "Centered footer",
  },
}

export function getSectionLayoutOptions(type: SectionType): SectionLayoutOption[] {
  const labels = sectionLayoutLabels[type]

  return SECTION_LAYOUT_OPTIONS.map((option) => ({
    ...option,
    label: labels?.[option.value] ?? option.label,
  }))
}

const legacyLayoutMap: Record<string, SectionLayout> = {
  centered: "classic",
  grid: "classic",
  fullwidth: "showcase",
  featured: "showcase",
  "full-slider": "showcase",
  minimal: "compact",
  list: "split",
  "vertical-carousel": "split",
  "split-reverse": "banner",
  carousel: "banner",
  masonry: "banner",
  magazine: "card",
  "single-with-thumbs": "card",
}

export function normalizeSectionLayout(value: unknown, fallback: SectionLayout = "classic"): SectionLayout {
  if (typeof value !== "string") return fallback
  if (SECTION_LAYOUT_OPTIONS.some((option) => option.value === value)) return value as SectionLayout
  return legacyLayoutMap[value] ?? fallback
}

export function getDefaultLayoutForSection(type: SectionType): SectionLayout {
  if (type === "nav" || type === "footer") return "classic"
  return "classic"
}

export function getLayoutClasses(layoutValue: unknown) {
  const layout = normalizeSectionLayout(layoutValue)

  return {
    layout,
    section:
      layout === "compact"
        ? "py-8 sm:py-10 md:py-12"
        : layout === "showcase"
          ? "py-16 sm:py-20 md:py-28"
          : layout === "banner"
            ? "py-10 sm:py-12 md:py-14"
            : "py-12 sm:py-16 md:py-20",
    container:
      layout === "compact"
        ? "max-w-3xl"
        : layout === "split" || layout === "showcase" || layout === "banner"
          ? "max-w-6xl"
          : "max-w-4xl",
    heading:
      layout === "split"
        ? "text-left"
        : layout === "compact"
          ? "text-left md:text-center"
          : "text-center",
    grid:
      layout === "compact"
        ? "grid-cols-1"
        : layout === "split"
          ? "md:grid-cols-2"
          : layout === "showcase"
            ? "lg:grid-cols-2"
            : layout === "banner"
              ? "lg:grid-cols-4"
              : "md:grid-cols-2 lg:grid-cols-3",
    card:
      layout === "compact"
        ? "rounded-lg p-4"
        : layout === "showcase"
          ? "rounded-2xl p-8 shadow-md"
          : "rounded-2xl p-6 shadow-sm",
  }
}
