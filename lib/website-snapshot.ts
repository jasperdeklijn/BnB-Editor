import type { SupabaseClient } from "@supabase/supabase-js"

import type { Section, SectionType, Transition } from "@/lib/types"
import type { ThemeConfig } from "@/lib/themes"

export const WEBSITE_SNAPSHOT_VERSION = 1 as const

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
    snapshot.version === WEBSITE_SNAPSHOT_VERSION &&
    typeof snapshot.draftVersion === "string" &&
    Boolean(snapshot.website?.id) &&
    Array.isArray(snapshot.sections) &&
    Array.isArray(snapshot.transitions) &&
    Array.isArray(snapshot.services) &&
    Array.isArray(snapshot.availabilityWindows)
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

  const [sectionsResult, transitionsResult, businessResult, servicesResult, availabilityResult] = await Promise.all([
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
  ])

  const firstError = [
    sectionsResult.error,
    transitionsResult.error,
    businessResult.error,
    servicesResult.error,
    availabilityResult.error,
  ].find(Boolean)
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
    business,
    services,
    availabilityWindows: (availabilityResult.data as SnapshotAvailabilityWindow[] | null) ?? [],
    sections,
    transitions,
  }
}
