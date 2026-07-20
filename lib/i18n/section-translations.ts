import type { Section, SectionType } from "@/lib/types"

export interface TranslatableFieldDefinition {
  key: string
  label: string
  required?: boolean
}

const DEFAULT_NAVIGATION_LABELS: Partial<Record<SectionType, string>> = {
  hero: "Home",
  about: "Over",
  services: "Aanbod",
  gallery: "Galerij",
  features: "Kenmerken",
  testimonials: "Recensies",
  faq: "FAQ",
  opening_hours: "Openingstijden",
  pricing: "Prijzen",
  team: "Team",
  map: "Locatie",
  cta: "Actie",
  request_form: "Aanvraag",
  contact: "Contact",
}

const NAVIGABLE_SECTION_TYPES = new Set<SectionType>(Object.keys(DEFAULT_NAVIGATION_LABELS) as SectionType[])

export interface ResolvedNavigationLink {
  sectionId: string
  label: string
  enabled: boolean
}

export function resolveNavigationLinks(
  navData: Record<string, unknown>,
  allSections: Section[],
): ResolvedNavigationLink[] {
  const configuredLinks = Array.isArray(navData.navLinks)
    ? navData.navLinks.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    : []

  return allSections
    .filter((section) => NAVIGABLE_SECTION_TYPES.has(section.type))
    .map((section) => {
      const configured = configuredLinks.find((entry) => entry.sectionId === section.id)
      return {
        sectionId: section.id,
        label: (typeof configured?.label === "string" && configured.label.trim())
          ? configured.label
          : (typeof section.data.title === "string" && section.data.title.trim())
            ? section.data.title
            : DEFAULT_NAVIGATION_LABELS[section.type] ?? "Sectie",
        enabled: configured?.enabled !== false,
      }
    })
}

export function materializeNavigationTranslationSource(section: Section, allSections: Section[]): Section {
  if (section.type !== "nav") return section
  return {
    ...section,
    data: {
      ...section.data,
      navLinks: resolveNavigationLinks(section.data, allSections),
    },
  }
}

export const SECTION_TRANSLATABLE_FIELDS = {
  nav: [
    { key: "brandName", label: "Bedrijfsnaam", required: true },
    { key: "navLinks", label: "Navigatielinks", required: true },
  ],
  hero: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
    { key: "ctaText", label: "Knoptekst", required: true },
  ],
  about: [
    { key: "title", label: "Titel", required: true },
    { key: "description", label: "Beschrijving", required: true },
  ],
  services: [
    { key: "title", label: "Titel", required: true },
    { key: "moreInfoButtonLabel", label: "Meer-info-knop", required: true },
    { key: "infoPopupEyebrow", label: "Popup-label" },
    { key: "infoPopupTitle", label: "Popup-titel" },
    { key: "infoPopupIntro", label: "Popup-intro" },
    { key: "infoPopupCtaLabel", label: "Popup-knop" },
    { key: "infoPopupHelperText", label: "Popup-hulptekst" },
    { key: "bookingSpaceHeading", label: "Boekingstitel" },
    { key: "bookingSpaceIntro", label: "Boekingsintro" },
    { key: "bookingSpaceButtonLabel", label: "Boekingsknop" },
    { key: "bookingSpaceSuccessText", label: "Bevestigingstekst" },
    { key: "bookingSpaceHelperText", label: "Boekingshulptekst" },
  ],
  gallery: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
  ],
  features: [
    { key: "title", label: "Titel", required: true },
    { key: "features", label: "Kenmerken", required: true },
  ],
  contact: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
  ],
  footer: [
    { key: "brandName", label: "Bedrijfsnaam", required: true },
    { key: "companyName", label: "Bedrijfsnaam", required: true },
    { key: "companyDescription", label: "Beschrijving", required: true },
    { key: "copyright", label: "Copyright", required: true },
    { key: "columns", label: "Linkkolommen", required: true },
  ],
  testimonials: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
    { key: "items", label: "Recensies", required: true },
  ],
  faq: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
    { key: "items", label: "Vragen en antwoorden", required: true },
  ],
  opening_hours: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel" },
    { key: "note", label: "Notitie" },
    { key: "items", label: "Dagen", required: true },
  ],
  pricing: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
    { key: "plans", label: "Pakketten", required: true },
    { key: "tariffs", label: "Tarieven", required: true },
  ],
  team: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
    { key: "members", label: "Teamleden", required: true },
  ],
  map: [{ key: "title", label: "Titel", required: true }],
  cta: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
    { key: "primaryCtaText", label: "Primaire knop", required: true },
    { key: "secondaryCtaText", label: "Secundaire knop" },
  ],
  request_form: [
    { key: "title", label: "Titel", required: true },
    { key: "subtitle", label: "Ondertitel", required: true },
  ],
} satisfies Record<SectionType, TranslatableFieldDefinition[]>

type TranslationItem = Record<string, unknown>

function itemId(item: TranslationItem, fallback: unknown) {
  const explicit = item.id ?? item.sectionId
  return typeof explicit === "string" && explicit ? explicit : `legacy-${getTranslationSourceHash(fallback)}`
}

function extractRepeaterValue(type: SectionType, key: string, value: unknown): unknown {
  if (!Array.isArray(value)) return value
  if (type === "features" && key === "features") {
    return value.map((item) => typeof item === "string"
      ? { id: `legacy-${getTranslationSourceHash(item)}`, text: item }
      : { id: itemId(item as TranslationItem, item), text: (item as TranslationItem).text ?? "" })
  }
  if (type === "nav" && key === "navLinks") {
    return value.map((item) => ({ sectionId: (item as TranslationItem).sectionId, label: (item as TranslationItem).label ?? "" }))
  }
  if (type === "footer" && key === "columns") {
    return value.map((column) => {
      const source = column as TranslationItem
      return {
        id: itemId(source, source.links),
        title: source.title ?? "",
        links: Array.isArray(source.links) ? source.links.map((link) => {
          const sourceLink = link as TranslationItem
          return { id: itemId(sourceLink, sourceLink.href), label: sourceLink.label ?? "" }
        }) : [],
      }
    })
  }
  if ((type === "faq" || type === "testimonials") && key === "items") {
    const allowed = type === "faq" ? ["question", "answer"] : ["name", "role", "quote"]
    return value.map((item) => {
      const source = item as TranslationItem
      return Object.fromEntries([["id", itemId(source, source)], ...allowed.map((field) => [field, source[field] ?? ""])])
    })
  }
  if (type === "opening_hours" && key === "items") {
    return value.map((item) => {
      const source = item as TranslationItem
      return { id: itemId(source, source.label), label: source.label ?? "" }
    })
  }
  if (type === "pricing" && (key === "plans" || key === "tariffs")) {
    const allowed = key === "plans" ? ["name", "period", "description", "features", "ctaText"] : ["name", "description", "category"]
    return value.map((item) => {
      const source = item as TranslationItem
      return Object.fromEntries([["id", itemId(source, source)], ...allowed.map((field) => [field,
        field === "features" && Array.isArray(source.features)
          ? source.features.map((feature) => typeof feature === "string"
              ? { id: `legacy-${getTranslationSourceHash(feature)}`, text: feature }
              : { id: itemId(feature as TranslationItem, feature), text: (feature as TranslationItem).text ?? "" })
          : source[field] ?? (field === "features" ? [] : ""),
      ])])
    })
  }
  if (type === "team" && key === "members") {
    return value.map((item) => {
      const source = item as TranslationItem
      return { id: itemId(source, source), name: source.name ?? "", title: source.title ?? "", bio: source.bio ?? "" }
    })
  }
  return value
}

function repeaterAllowedFields(type: SectionType, key: string) {
  if (type === "features" && key === "features") return ["text"]
  if (type === "nav" && key === "navLinks") return ["label"]
  if (type === "footer" && key === "columns") return ["title", "links"]
  if (type === "faq" && key === "items") return ["question", "answer"]
  if (type === "testimonials" && key === "items") return ["name", "role", "quote"]
  if (type === "opening_hours" && key === "items") return ["label"]
  if (type === "pricing" && key === "plans") return ["name", "period", "description", "features", "ctaText"]
  if (type === "pricing" && key === "tariffs") return ["name", "description", "category"]
  if (type === "team" && key === "members") return ["name", "title", "bio"]
  return []
}

function mergeRepeater(sourceValue: unknown, translatedValue: unknown, allowedFields: string[]): unknown {
  if (!Array.isArray(sourceValue) || !Array.isArray(translatedValue)) return translatedValue
  const translatedById = new Map(translatedValue.filter((item): item is TranslationItem => Boolean(item && typeof item === "object")).map((item) => [itemId(item, item), item]))
  return sourceValue.map((item) => {
    if (!item || typeof item !== "object") return item
    const source = item as TranslationItem
    const translated = translatedById.get(itemId(source, source))
    if (!translated) return source
    const safeTranslated = Object.fromEntries(allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(translated, field)).map((field) => [field, translated[field]]))
    const merged = { ...source, ...safeTranslated }
    if (Array.isArray(source.links) && Array.isArray(translated.links)) {
      merged.links = mergeRepeater(source.links, translated.links, ["label"])
    }
    if (Array.isArray(source.features) && Array.isArray(translated.features)) {
      merged.features = mergeRepeater(source.features, translated.features, ["text"])
    }
    return merged
  })
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

export function extractTranslatableValues(type: SectionType, data: Record<string, unknown>) {
  return Object.fromEntries(
    SECTION_TRANSLATABLE_FIELDS[type]
      .filter(({ key }) => Object.prototype.hasOwnProperty.call(data, key))
      .map(({ key }) => [key, extractRepeaterValue(type, key, data[key])]),
  )
}

export function applySectionTranslation(section: Section, values: Record<string, unknown> | null | undefined): Section {
  if (!values) return section
  const allowedKeys = new Set(SECTION_TRANSLATABLE_FIELDS[section.type].map(({ key }) => key))
  const safeValues = Object.fromEntries(Object.entries(values).filter(([key]) => allowedKeys.has(key)).map(([key, value]) => [
    key,
    Array.isArray(section.data[key]) ? mergeRepeater(section.data[key], value, repeaterAllowedFields(section.type, key)) : value,
  ]))
  return { ...section, data: { ...section.data, ...safeValues } }
}

export function getSectionSourceHash(section: Pick<Section, "type" | "data">) {
  return getTranslationSourceHash(extractTranslatableValues(section.type, section.data))
}

export function getTranslationSourceHash(value: unknown) {
  const input = stableStringify(value)
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function hasValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined
}

function hasCompleteNavigationTranslation(sourceValue: unknown, translatedValue: unknown) {
  if (!Array.isArray(sourceValue) || sourceValue.length === 0) return true
  if (!Array.isArray(translatedValue)) return false
  return sourceValue.every((sourceEntry) => {
    if (!sourceEntry || typeof sourceEntry !== "object") return true
    const sectionId = (sourceEntry as TranslationItem).sectionId
    const translatedEntry = translatedValue.find((entry) => (
      entry && typeof entry === "object" && (entry as TranslationItem).sectionId === sectionId
    )) as TranslationItem | undefined
    return typeof translatedEntry?.label === "string" && translatedEntry.label.trim().length > 0
  })
}

export function getSectionTranslationStatus(
  section: Pick<Section, "type" | "data">,
  values: Record<string, unknown> | null | undefined,
  sourceHash?: string | null,
) {
  const required = SECTION_TRANSLATABLE_FIELDS[section.type].filter(
    (field) => field.required && hasValue(section.data[field.key]),
  )
  const missing = required.filter(({ key }) => (
    section.type === "nav" && key === "navLinks"
      ? !hasCompleteNavigationTranslation(section.data[key], values?.[key])
      : !hasValue(values?.[key])
  )).map(({ key }) => key)
  if (missing.length > 0) return { status: "missing" as const, missing }
  if (sourceHash && sourceHash !== getSectionSourceHash(section)) return { status: "stale" as const, missing: [] }
  return { status: "complete" as const, missing: [] }
}
