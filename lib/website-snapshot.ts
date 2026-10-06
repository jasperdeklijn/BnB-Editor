import type { SupabaseClient } from "@supabase/supabase-js"

import type { Section, SectionType, Transition } from "@/lib/types"
import type { ThemeConfig } from "@/lib/themes"
import { DEFAULT_WEBSITE_LOCALE, type SupportedWebsiteLocale } from "@/lib/i18n/locales"
import { applySectionTranslation, getSectionTranslationStatus, getTranslationSourceHash, materializeNavigationTranslationSource } from "@/lib/i18n/section-translations"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"
import { isMissingRelationError } from "@/lib/supabase/errors"
import { mapWebsitePage, RESERVED_PAGE_SLUGS, type WebsitePage } from "@/lib/website-pages"
import { invalidWebsiteLinks } from "@/lib/website-links"

export const WEBSITE_SNAPSHOT_VERSION = 3 as const

export interface SnapshotBusiness {
  id: string
  name: string
  category: string
  description: string
  phone: string
  email: string
  whatsapp: string
  street: string
  city: string
  postal: string
  country: string
  latitude: number | null
  longitude: number | null
  social_links: Record<string, unknown>
  opening_note: string
}

export interface SnapshotService {
  id: string
  business_id: string
  title: string
  description: string
  price: string
  duration: string | null
  capacity: number | null
  image_urls: unknown
  tags: unknown
  position: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface SnapshotAvailabilityWindow {
  id: string
  business_id: string
  service_id: string | null
  weekday: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
}

export interface WebsiteLiveSnapshot {
  version: typeof WEBSITE_SNAPSHOT_VERSION
  publishedAt: string
  draftVersion: string
  website: {
    id: string
    businessId: string | null
    title: string
    slug: string
    customDomain: string | null
    seo: Record<string, unknown>
    themeConfig: ThemeConfig | null
  }
  business: SnapshotBusiness | null
  services: SnapshotService[]
  availabilityWindows: SnapshotAvailabilityWindow[]
  sections: Section[]
  transitions: Transition[]
  locales: WebsiteSnapshotLocale[]
  pages: WebsiteSnapshotPage[]
  sharedSections: Section[]
  redirects: Array<{ fromSlug: string; toPageId: string }>
  /** Immutable page IDs/paths used by saved link references. */
  linkPages?: WebsitePage[]
  translationWarnings?: Array<{ locale: SupportedWebsiteLocale; source: "section" | "business" | "service" | "page"; id: string; label: string }>
}

export interface WebsiteSnapshotPage extends WebsitePage {
  sections: Section[]
  transitions: Transition[]
  locales: Array<{ locale: SupportedWebsiteLocale; title: string; navigationLabel: string; seo: Record<string, unknown>; sections: Section[] }>
}

export interface WebsiteSnapshotLocale {
  locale: SupportedWebsiteLocale
  pathSegment: string
  displayName: string
  isDefault: boolean
  seo: Record<string, unknown>
  business: SnapshotBusiness | null
  services: SnapshotService[]
  sections: Section[]
}

interface BuildSnapshotOptions {
  supabase: SupabaseClient
  websiteId: string
  userId: string
}

export function isWebsiteLiveSnapshot(value: unknown): value is WebsiteLiveSnapshot {
  try {
  if (!value || typeof value !== "object") return false
  const snapshot = value as Partial<WebsiteLiveSnapshot>
  return (
    snapshot.version === WEBSITE_SNAPSHOT_VERSION &&
    typeof snapshot.draftVersion === "string" &&
    Boolean(snapshot.website?.id) &&
    Array.isArray(snapshot.sections) &&
    Array.isArray(snapshot.transitions) &&
    Array.isArray(snapshot.services) &&
    Array.isArray(snapshot.availabilityWindows) &&
    Array.isArray(snapshot.locales)
    && Array.isArray(snapshot.pages) && snapshot.pages.length > 0
    && snapshot.pages.filter((page) => page.isHome).length === 1
    && new Set(snapshot.pages.map((page) => page.id)).size === snapshot.pages.length
    && new Set(snapshot.pages.map((page) => page.slug)).size === snapshot.pages.length
    && snapshot.pages.every((page) => typeof page.id === "string" && page.websiteId === snapshot.website?.id
      && page.includeInPublication === true && typeof page.slug === "string"
      && (page.isHome ? page.slug === "" : /^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug) && !RESERVED_PAGE_SLUGS.has(page.slug))
      && Array.isArray(page.sections) && Array.isArray(page.transitions) && Array.isArray(page.locales)
      && page.sections.every((section) => typeof section.id === "string" && typeof section.type === "string" && Boolean(section.data))
      && page.transitions.every((transition) => page.sections.some((section) => section.id === transition.fromSectionId)
        && page.sections.some((section) => section.id === transition.toSectionId)))
    && Array.isArray(snapshot.sharedSections) && snapshot.sharedSections.length <= 2
    && snapshot.sharedSections.every((section) => section.type === "nav" || section.type === "footer")
    && new Set(snapshot.sharedSections.map((section) => section.type)).size === snapshot.sharedSections.length
    && snapshot.locales.length > 0 && snapshot.locales.filter((locale) => locale.isDefault).length === 1
    && new Set(snapshot.locales.map((locale) => locale.locale)).size === snapshot.locales.length
    && snapshot.locales.every((locale) => typeof locale.locale === "string" && typeof locale.pathSegment === "string" && Array.isArray(locale.sections))
    && snapshot.pages.every((page) => page.locales.length === snapshot.locales!.length
      && new Set(page.locales.map((locale) => locale.locale)).size === page.locales.length
      && page.locales.every((locale) => snapshot.locales!.some((entry) => entry.locale === locale.locale)
        && typeof locale.title === "string" && locale.title.trim().length > 0 && Boolean(locale.seo) && Array.isArray(locale.sections)
        && locale.sections.length === page.sections.length && new Set(locale.sections.map((section) => section.id)).size === locale.sections.length && locale.sections.every((section) => page.sections.some((source) => source.id === section.id))))
    && (() => {
      const all = [...snapshot.sharedSections!, ...snapshot.pages!.flatMap((page) => page.sections)]
      const ids = new Set(all.map((section) => section.id))
      if (ids.size !== all.length || snapshot.sections!.length !== all.length || new Set(snapshot.sections!.map((section) => section.id)).size !== all.length || snapshot.sections!.some((section) => !ids.has(section.id))) return false
      const membership = new Map<string, string | null>(snapshot.pages!.flatMap((page) => page.sections.map((section): [string,string|null] => [section.id,page.id])))
      snapshot.sharedSections!.forEach((section) => membership.set(section.id,null))
      return snapshot.pages!.every((page) => page.locales.every((locale) => locale.sections.every((section) => invalidWebsiteLinks(section.data,snapshot.pages!,membership,page.id).length === 0)))
        && snapshot.sharedSections!.every((section) => invalidWebsiteLinks(section.data,snapshot.pages!,membership).length === 0)
        && snapshot.locales!.every((locale) => locale.sections.length === all.length && new Set(locale.sections.map((section) => section.id)).size === all.length && locale.sections.every((section) => ids.has(section.id) && invalidWebsiteLinks(section.data,snapshot.pages!,membership,membership.get(section.id) ?? undefined).length === 0))
    })()
    && Array.isArray(snapshot.redirects) && new Set(snapshot.redirects.map((redirect) => redirect.fromSlug)).size === snapshot.redirects.length
    && snapshot.redirects.every((redirect) => typeof redirect.fromSlug === "string"
      && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(redirect.fromSlug) && !RESERVED_PAGE_SLUGS.has(redirect.fromSlug)
      && snapshot.pages!.some((page) => page.id === redirect.toPageId)
      && !snapshot.pages!.some((page) => page.slug === redirect.fromSlug))
  )
  } catch { return false }
}

export async function buildWebsiteLiveSnapshot({
  supabase,
  websiteId,
  userId,
}: BuildSnapshotOptions): Promise<WebsiteLiveSnapshot> {
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, user_id, business_id, title, slug, custom_domain, seo, theme_config, draft_version")
    .eq("id", websiteId)
    .eq("user_id", userId)
    .single()

  if (websiteError || !website) {
    if (
      websiteError?.message.includes("draft_version") ||
      websiteError?.message.includes("live_snapshot") ||
      websiteError?.code === "42703"
    ) {
      throw new Error(
        "De Supabase-database mist de live-publicatiemigratie. Voer migratie 20260716120000_repair_live_snapshot_publishing.sql uit en probeer opnieuw.",
      )
    }
    throw new Error(websiteError?.message || "Website not found")
  }

  let businessId = website.business_id as string | null
  if (!businessId) {
    const { data: fallbackBusiness, error: fallbackError } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (fallbackError) throw new Error(fallbackError.message)
    businessId = fallbackBusiness?.id ?? null
  }

  const [
    sectionsResult,
    transitionsResult,
    businessResult,
    servicesResult,
    availabilityResult,
    localesResult,
    sectionTranslationsResult,
    businessTranslationsResult,
    serviceTranslationsResult,
    pagesResult,
  ] = await Promise.all([
    supabase
      .from("website_sections")
      .select("id, page_id, scope, type, position, content, styles")
      .eq("website_id", websiteId)
      .order("position", { ascending: true }),
    supabase
      .from("section_transitions")
      .select("id, from_section_id, to_section_id, transition")
      .eq("website_id", websiteId),
    businessId
      ? supabase
          .from("businesses")
          .select("id, name, category, description, phone, email, whatsapp, street, city, postal, country, latitude, longitude, social_links, opening_note")
          .eq("id", businessId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    businessId
      ? supabase.from("services").select("*").eq("business_id", businessId).order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    businessId
      ? supabase
          .from("calendar_availability_windows")
          .select("id, business_id, service_id, weekday, start_time, end_time, timezone, is_active")
          .eq("business_id", businessId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("website_locales")
      .select("locale, path_segment, display_name, is_default, is_enabled, seo")
      .eq("website_id", websiteId)
      .or("is_default.eq.true,is_enabled.eq.true")
      .order("is_default", { ascending: false }),
    supabase
      .from("website_section_translations")
      .select("section_id, locale, values, source_hash")
      .eq("website_id", websiteId),
    businessId
      ? supabase
          .from("business_translations")
          .select("locale, name, description, opening_note, source_hash")
          .eq("business_id", businessId)
      : Promise.resolve({ data: [], error: null }),
    businessId
      ? supabase
          .from("service_translations")
          .select("service_id, locale, title, description, source_hash")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("website_pages").select("*").eq("website_id", websiteId).eq("include_in_publication", true).order("position"),
  ])
  if (pagesResult.error) throw new Error(pagesResult.error.message)

  const firstError = [
    sectionsResult.error,
    transitionsResult.error,
    businessResult.error,
    servicesResult.error,
    availabilityResult.error,
    localesResult.error,
    sectionTranslationsResult.error,
    businessTranslationsResult.error,
    serviceTranslationsResult.error,
  ].find((error) => Boolean(error) && !isMissingRelationError(error))
  if (firstError) throw new Error(firstError.message)
  const linkPages = (pagesResult.data ?? []).map(mapWebsitePage)
  if (linkPages.filter((page) => page.isHome).length !== 1) throw new Error("De startpagina ontbreekt of is niet opgenomen in publicatie.")
  const includedIds = new Set(linkPages.map((page) => page.id))
  const includedRows = (sectionsResult.data ?? []).filter((row) => row.scope !== "page" || includedIds.has(row.page_id))
  const sectionPages = new Map<string, string | null>(includedRows.map((row) => [row.id, row.page_id]))
  if (includedRows.some((row) => invalidWebsiteLinks(row.content, linkPages, sectionPages, row.page_id).length > 0)) {
    throw new Error("Een link verwijst naar een verwijderde pagina, een conceptpagina of een onbekende sectie. Kies eerst een geldig linkdoel.")
  }

  const business = (businessResult.data as SnapshotBusiness | null) ?? null
  const services = (servicesResult.data as SnapshotService[] | null) ?? []
  const sections: Section[] = includedRows.map((row) => {
    const content = (row.content ?? {}) as Record<string, unknown>
    const { recipientEmail: _privateRecipientEmail, ...publicContent } = content
    const selectedServiceIds = Array.isArray(content.serviceIds) ? content.serviceIds : []
    const sectionServices =
      selectedServiceIds.length > 0
        ? services.filter((service) => selectedServiceIds.includes(service.id))
        : services

    return {
      id: row.id,
      type: row.type as SectionType,
      data: {
        ...publicContent,
        businessId,
        websiteId: website.id,
        businessCategory: business?.category ?? null,
        formDestinationKey: row.id,
        ...(row.type === "services" ? { services: sectionServices } : {}),
      },
      styles: (row.styles ?? {}) as Section["styles"],
    }
  })

  const transitions: Transition[] = (transitionsResult.data ?? []).filter((row) => sectionPages.has(row.from_section_id) && sectionPages.has(row.to_section_id)).map((row) => ({
    id: row.id,
    fromSectionId: row.from_section_id,
    toSectionId: row.to_section_id,
    type: row.transition?.type || "none",
  }))

  const configuredLocaleRows = isMultilingualWebsitesEnabled()
    ? localesResult.data
    : localesResult.data?.filter((locale) => locale.is_default)
  const configuredLocales = (configuredLocaleRows?.length ? configuredLocaleRows : [{
    locale: DEFAULT_WEBSITE_LOCALE,
    path_segment: "nl",
    display_name: "Nederlands",
    is_default: true,
    is_enabled: true,
    seo: website.seo ?? {},
  }]) as Array<{
    locale: SupportedWebsiteLocale
    path_segment: string
    display_name: string
    is_default: boolean
    is_enabled: boolean
    seo: Record<string, unknown> | null
  }>
  const sectionTranslationRows = sectionTranslationsResult.data ?? []
  const businessTranslationRows = businessTranslationsResult.data ?? []
  const serviceTranslationRows = serviceTranslationsResult.data ?? []
  const translationWarnings: NonNullable<WebsiteLiveSnapshot["translationWarnings"]> = []

  const locales: WebsiteSnapshotLocale[] = configuredLocales.map((locale) => {
    if (!locale.is_default && business) {
      const translation = businessTranslationRows.find((row) => row.locale === locale.locale)
      const missingBusinessField = (["name", "description", "opening_note"] as const).some(
        (field) => Boolean(business[field]?.trim()) && !translation?.[field]?.trim(),
      )
      if (missingBusinessField) {
        throw new Error(`${locale.display_name}: vertaling van bedrijfsgegevens ontbreekt.`)
      }
      if (translation?.source_hash && translation.source_hash !== getTranslationSourceHash({
        name: business.name,
        description: business.description,
        opening_note: business.opening_note,
      })) {
        translationWarnings.push({ locale: locale.locale, source: "business", id: business.id, label: business.name })
      }
      const missingService = services.find((service) => {
        const serviceTranslation = serviceTranslationRows.find(
          (row) => row.service_id === service.id && row.locale === locale.locale,
        )
        return (Boolean(service.title?.trim()) && !serviceTranslation?.title?.trim()) ||
          (Boolean(service.description?.trim()) && !serviceTranslation?.description?.trim())
      })
      if (missingService) {
        throw new Error(`${locale.display_name}: vertaling ontbreekt voor dienst ${missingService.title}.`)
      }
      for (const service of services) {
        const serviceTranslation = serviceTranslationRows.find(
          (row) => row.service_id === service.id && row.locale === locale.locale,
        )
        if (serviceTranslation?.source_hash && serviceTranslation.source_hash !== getTranslationSourceHash({ title: service.title, description: service.description })) {
          translationWarnings.push({ locale: locale.locale, source: "service", id: service.id, label: service.title })
        }
      }
    }
    const localizedBusiness = locale.is_default || !business
      ? business
      : (() => {
          const translation = businessTranslationRows.find((row) => row.locale === locale.locale)
          return translation ? {
            ...business,
            name: translation.name || business.name,
            description: translation.description || business.description,
            opening_note: translation.opening_note || business.opening_note,
          } : business
        })()
    const localizedServices = locale.is_default
      ? services
      : services.map((service) => {
          const translation = serviceTranslationRows.find(
            (row) => row.service_id === service.id && row.locale === locale.locale,
          )
          return translation ? {
            ...service,
            title: translation.title || service.title,
            description: translation.description || service.description,
          } : service
        })
    const localizedSections = sections.map((section) => {
      if (locale.is_default) return section
      const sourcePage = sectionPages.get(section.id)
      const translationSource = materializeNavigationTranslationSource(section, section.data.navigationMode === "pages" ? [] : sourcePage
        ? sections.filter((entry) => sectionPages.get(entry.id) === sourcePage) : sections)
      const translation = sectionTranslationRows.find(
        (row) => row.section_id === section.id && row.locale === locale.locale,
      )
      const status = getSectionTranslationStatus(
        translationSource,
        (translation?.values as Record<string, unknown> | undefined),
        translation?.source_hash,
      )
      if (status.status === "missing") {
        throw new Error(`${locale.display_name}: vertaling ontbreekt voor sectie ${section.type}.`)
      }
      if (status.status === "stale") {
        translationWarnings.push({ locale: locale.locale, source: "section", id: section.id, label: section.type })
      }
      const translated = applySectionTranslation(translationSource, translation?.values as Record<string, unknown> | undefined)
      if (translated.type !== "services") return translated
      const selectedServiceIds = Array.isArray(translated.data.serviceIds) ? translated.data.serviceIds : []
      return {
        ...translated,
        data: {
          ...translated.data,
          services: selectedServiceIds.length > 0
            ? localizedServices.filter((service) => selectedServiceIds.includes(service.id))
            : localizedServices,
        },
      }
    })

    return {
      locale: locale.locale,
      pathSegment: locale.path_segment,
      displayName: locale.display_name,
      isDefault: locale.is_default,
      seo: (locale.is_default && Object.keys(locale.seo ?? {}).length === 0
        ? website.seo ?? {}
        : locale.seo ?? {}) as Record<string, unknown>,
      business: localizedBusiness,
      services: localizedServices,
      sections: localizedSections,
    }
  })
  const defaultLocaleBundle = locales.find((locale) => locale.isDefault) ?? locales[0]

  const [pageTranslations, redirectRows] = await Promise.all([
    supabase.from("website_page_translations").select("*").eq("website_id", websiteId),
    supabase.from("website_page_redirects").select("from_slug,to_page_id").eq("website_id", websiteId),
  ])
  if (pageTranslations.error || redirectRows.error) throw new Error(pageTranslations.error?.message || redirectRows.error?.message)
  const pages: WebsiteSnapshotPage[] = linkPages.map((page) => {
    const ids = new Set(includedRows.filter((row) => row.page_id === page.id).map((row) => row.id))
    return { ...page, sections: (defaultLocaleBundle?.sections ?? sections).filter((section) => ids.has(section.id)),
      transitions: transitions.filter((transition) => ids.has(transition.fromSectionId) && ids.has(transition.toSectionId)),
      locales: locales.map((bundle) => {
        const translation = pageTranslations.data?.find((row) => row.page_id === page.id && row.locale === bundle.locale)
        if (!bundle.isDefault && !translation?.title?.trim()) throw new Error(`${bundle.displayName}: vertaling van pagina ${page.title} ontbreekt.`)
        if (!bundle.isDefault && translation?.source_hash && translation.source_hash !== getTranslationSourceHash({ title: page.title, seo: page.seo })) {
          translationWarnings.push({ locale: bundle.locale, source: "page", id: page.id, label: page.title })
        }
        return { locale: bundle.locale, title: translation?.title || page.title, navigationLabel: translation?.navigation_label || translation?.title || page.title,
          seo: { ...bundle.seo, ...Object.fromEntries(Object.entries(page.seo ?? {}).filter(([, value]) => value !== "" && value != null)), ...Object.fromEntries(Object.entries(translation?.seo ?? {}).filter(([, value]) => value !== "" && value != null)) }, sections: bundle.sections.filter((section) => ids.has(section.id)) }
      }) }
  })
  const redirects = (redirectRows.data ?? []).map((row) => ({ fromSlug: row.from_slug, toPageId: row.to_page_id }))
  if (redirects.some((entry) => !includedIds.has(entry.toPageId) || RESERVED_PAGE_SLUGS.has(entry.fromSlug) || pages.some((page) => page.slug === entry.fromSlug))) {
    throw new Error("Een doorverwijzing botst met een pagina of verwijst naar een conceptpagina. Pas deze aan in Pagina-instellingen.")
  }

  const snapshot: WebsiteLiveSnapshot = {
    version: WEBSITE_SNAPSHOT_VERSION,
    publishedAt: new Date().toISOString(),
    draftVersion: website.draft_version,
    website: {
      id: website.id,
      businessId,
      title: website.title,
      slug: website.slug,
      customDomain: website.custom_domain,
      seo: (website.seo ?? {}) as Record<string, unknown>,
      themeConfig: (website.theme_config as ThemeConfig | null) ?? null,
    },
    business: defaultLocaleBundle?.business ?? business,
    services: defaultLocaleBundle?.services ?? services,
    availabilityWindows: (availabilityResult.data as SnapshotAvailabilityWindow[] | null) ?? [],
    sections: defaultLocaleBundle?.sections ?? sections,
    transitions,
    locales,
    pages,
    sharedSections: (defaultLocaleBundle?.sections ?? sections).filter((section) => sectionPages.get(section.id) === null),
    redirects,
    linkPages,
    translationWarnings,
  }
  if (!isWebsiteLiveSnapshot(snapshot)) throw new Error("De volledige multipage-publicatie is ongeldig. Controleer pagina's, talen en linkdoelen.")
  return snapshot
}
