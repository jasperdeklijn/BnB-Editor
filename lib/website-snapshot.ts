import type { SupabaseClient } from "@supabase/supabase-js"

import type { Section, SectionType, Transition } from "@/lib/types"
import type { ThemeConfig } from "@/lib/themes"
import { DEFAULT_WEBSITE_LOCALE, type SupportedWebsiteLocale } from "@/lib/i18n/locales"
import { applySectionTranslation, getSectionTranslationStatus, getTranslationSourceHash, materializeNavigationTranslationSource } from "@/lib/i18n/section-translations"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"
import { isMissingRelationError } from "@/lib/supabase/errors"

export const WEBSITE_SNAPSHOT_VERSION = 2 as const
export const LEGACY_WEBSITE_SNAPSHOT_VERSION = 1 as const

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
  version: typeof WEBSITE_SNAPSHOT_VERSION | typeof LEGACY_WEBSITE_SNAPSHOT_VERSION
  publishedAt: string
  draftVersion: string
  website: {
    id: string
    userId: string
    businessId: string | null
    title: string
    slug: string
    customDomain: string | null
    seo: Record<string, unknown>
    themeConfig: ThemeConfig | null
  }
  ownerEmail: string | null
  business: SnapshotBusiness | null
  services: SnapshotService[]
  availabilityWindows: SnapshotAvailabilityWindow[]
  sections: Section[]
  transitions: Transition[]
  locales?: WebsiteSnapshotLocale[]
  translationWarnings?: Array<{ locale: SupportedWebsiteLocale; source: "section" | "business" | "service"; id: string; label: string }>
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
  ownerEmail?: string | null
}

export function isWebsiteLiveSnapshot(value: unknown): value is WebsiteLiveSnapshot {
  if (!value || typeof value !== "object") return false
  const snapshot = value as Partial<WebsiteLiveSnapshot>
  return (
    (snapshot.version === WEBSITE_SNAPSHOT_VERSION || snapshot.version === LEGACY_WEBSITE_SNAPSHOT_VERSION) &&
    typeof snapshot.draftVersion === "string" &&
    Boolean(snapshot.website?.id) &&
    Array.isArray(snapshot.sections) &&
    Array.isArray(snapshot.transitions) &&
    Array.isArray(snapshot.services) &&
    Array.isArray(snapshot.availabilityWindows) &&
    (snapshot.version === LEGACY_WEBSITE_SNAPSHOT_VERSION || Array.isArray(snapshot.locales))
  )
}

export async function buildWebsiteLiveSnapshot({
  supabase,
  websiteId,
  userId,
  ownerEmail = null,
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
  ] = await Promise.all([
    supabase
      .from("website_sections")
      .select("id, type, position, content, styles")
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
  ])

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

  const business = (businessResult.data as SnapshotBusiness | null) ?? null
  const services = (servicesResult.data as SnapshotService[] | null) ?? []
  const sections: Section[] = (sectionsResult.data ?? []).map((row) => {
    const content = (row.content ?? {}) as Record<string, unknown>
    const selectedServiceIds = Array.isArray(content.serviceIds) ? content.serviceIds : []
    const sectionServices =
      selectedServiceIds.length > 0
        ? services.filter((service) => selectedServiceIds.includes(service.id))
        : services

    return {
      id: row.id,
      type: row.type as SectionType,
      data: {
        ...content,
        businessId,
        websiteId: website.id,
        businessCategory: business?.category ?? null,
        recipientEmail: content.recipientEmail || business?.email || ownerEmail || undefined,
        ...(row.type === "services" ? { services: sectionServices } : {}),
      },
      styles: (row.styles ?? {}) as Section["styles"],
    }
  })

  const transitions: Transition[] = (transitionsResult.data ?? []).map((row) => ({
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
      const translationSource = materializeNavigationTranslationSource(section, sections)
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

  return {
    version: WEBSITE_SNAPSHOT_VERSION,
    publishedAt: new Date().toISOString(),
    draftVersion: website.draft_version,
    website: {
      id: website.id,
      userId: website.user_id,
      businessId,
      title: website.title,
      slug: website.slug,
      customDomain: website.custom_domain,
      seo: (website.seo ?? {}) as Record<string, unknown>,
      themeConfig: (website.theme_config as ThemeConfig | null) ?? null,
    },
    ownerEmail,
    business: defaultLocaleBundle?.business ?? business,
    services: defaultLocaleBundle?.services ?? services,
    availabilityWindows: (availabilityResult.data as SnapshotAvailabilityWindow[] | null) ?? [],
    sections: defaultLocaleBundle?.sections ?? sections,
    transitions,
    locales,
    translationWarnings,
  }
}
