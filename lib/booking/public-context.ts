import type { SupabaseClient } from "@supabase/supabase-js"

import type { BusyCalendarEntryInput } from "@/lib/booking/availability"
import type { ServiceBookingSettings } from "@/lib/booking/types"
import { DEFAULT_WEBSITE_LOCALE, isSupportedWebsiteLocale } from "@/lib/i18n/locales"
import { shouldEnforcePlanEntitlements } from "@/lib/plan-enforcement"
import { getUserSubscription, hasBookingAddonAccess } from "@/lib/subscriptions"
import { createAdminClient } from "@/lib/supabase/admin"
import { isWebsiteLiveSnapshot, type SnapshotService, type WebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { loadBookingPlanning, servicePlanningInput } from "@/lib/booking/planning-data"
import type { AvailabilityWindowInput } from "@/lib/booking/availability"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class PublicBookingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "BOOKING_REQUEST_INVALID",
  ) {
    super(message)
    this.name = "PublicBookingError"
  }
}

export interface PublicBookingContext {
  planning: Awaited<ReturnType<typeof loadBookingPlanning>>
  resource?: { capacity: number; windows: AvailabilityWindowInput[]; entries: BusyCalendarEntryInput[] }
  supabase: SupabaseClient
  snapshot: WebsiteLiveSnapshot
  websiteId: string
  businessId: string
  userId: string
  service: SnapshotService
  settings: ServiceBookingSettings
  locale: string
  serviceTitle: string
  recipientEmail: string
}

function calendarBookingSectionIds(snapshot: WebsiteLiveSnapshot, serviceId: string) {
  const sections = [
    ...snapshot.sections,
    ...snapshot.locales.flatMap((locale) => locale.sections),
  ]

  return [...new Set(sections.filter((section) => {
    if (section.type !== "services") return false
    const data = section.data as Record<string, unknown>
    if (data.bookingSpaceEnabled !== true || data.bookingSpaceMode !== "calendar") return false
    const selected = Array.isArray(data.bookingSpaceServiceIds)
      ? data.bookingSpaceServiceIds.filter((id): id is string => typeof id === "string")
      : []
    return selected.length === 0 || selected.includes(serviceId)
  }).map((section) => section.id))]
}

function sectionAllowsCalendarBooking(snapshot: WebsiteLiveSnapshot, serviceId: string) {
  return calendarBookingSectionIds(snapshot, serviceId).length > 0
}

export async function resolvePublicBookingContext(input: {
  websiteId: string
  serviceId: string
  locale?: string
}): Promise<PublicBookingContext> {
  if (!UUID_PATTERN.test(input.websiteId) || !UUID_PATTERN.test(input.serviceId)) {
    throw new PublicBookingError("Ongeldige boekingslink.", 400)
  }

  const supabase = await createAdminClient()
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, user_id, published, live_snapshot")
    .eq("id", input.websiteId)
    .maybeSingle()

  const snapshot = website?.published && isWebsiteLiveSnapshot(website.live_snapshot)
    ? website.live_snapshot
    : null

  if (websiteError || !website || !snapshot) {
    throw new PublicBookingError(
      "Online boeken is alleen beschikbaar op de gepubliceerde website.",
      409,
      "BOOKING_WEBSITE_NOT_LIVE",
    )
  }

  const businessId = snapshot.website.businessId
  const service = snapshot.services.find((candidate) => candidate.id === input.serviceId)
  if (!businessId || !service || service.business_id !== businessId || !sectionAllowsCalendarBooking(snapshot, service.id)) {
    throw new PublicBookingError("Deze dienst kan niet via deze website worden geboekt.", 404)
  }

  const subscription = await getUserSubscription(supabase, website.user_id)
  if (shouldEnforcePlanEntitlements() && !hasBookingAddonAccess(subscription)) {
    throw new PublicBookingError(
      "Online boeken is niet beschikbaar binnen het huidige abonnement van deze website.",
      403,
      "RUNTIME_ENTITLEMENT_REQUIRED",
    )
  }

  const { data: settings, error: settingsError } = await supabase
    .from("service_booking_settings")
    .select("*")
    .eq("service_id", service.id)
    .eq("business_id", businessId)
    .maybeSingle()

  if (settingsError) {
    console.error("[booking] Could not read service booking settings", settingsError)
    throw new PublicBookingError("De boekingsmodule is nog niet beschikbaar.", 503, "BOOKING_SCHEMA_UNAVAILABLE")
  }
  if (!settings?.booking_enabled) {
    throw new PublicBookingError("Online boeken staat voor deze dienst niet aan.", 409, "BOOKING_DISABLED")
  }

  const requestedLocale = isSupportedWebsiteLocale(input.locale) ? input.locale : DEFAULT_WEBSITE_LOCALE
  const liveLocale = snapshot.locales.find((candidate) => candidate.locale === requestedLocale)
    ?? snapshot.locales.find((candidate) => candidate.isDefault)
  const localizedService = liveLocale?.services.find((candidate) => candidate.id === service.id)
  const destinationSectionIds = calendarBookingSectionIds(snapshot, service.id)
  const { data: destination } = destinationSectionIds.length
    ? await supabase
        .from("website_form_destinations")
        .select("recipient_email")
        .eq("website_id", website.id)
        .in("section_id", destinationSectionIds)
        .limit(1)
        .maybeSingle()
    : { data: null }
  const { data: owner } = destination?.recipient_email || snapshot.business?.email
    ? { data: null }
    : await supabase.auth.admin.getUserById(website.user_id)

  const planning = await loadBookingPlanning(supabase, businessId)
  const live = servicePlanningInput(planning, settings as ServiceBookingSettings)
  return {
    planning,
    resource: live.resource,
    supabase,
    snapshot: { ...snapshot, availabilityWindows: live.windows as WebsiteLiveSnapshot["availabilityWindows"] },
    websiteId: website.id,
    businessId,
    userId: website.user_id,
    service,
    settings: settings as ServiceBookingSettings,
    locale: liveLocale?.locale ?? DEFAULT_WEBSITE_LOCALE,
    serviceTitle: localizedService?.title || service.title,
    recipientEmail: destination?.recipient_email || snapshot.business?.email || owner?.user?.email || "",
  }
}

export async function getBusyEntries(
  context: PublicBookingContext,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<BusyCalendarEntryInput[]> {
  return context.planning.entries.filter((entry) => (entry.service_id === null || entry.service_id === context.service.id) && new Date(entry.start_at) < rangeEnd && new Date(entry.end_at) > rangeStart)
}

export function bookingErrorResponse(error: unknown) {
  if (error instanceof PublicBookingError) {
    return { error: error.message, code: error.code, status: error.status }
  }
  console.error("[booking] Unexpected public booking error", error)
  return { error: "Boeken is nu niet gelukt. Probeer het opnieuw.", code: "BOOKING_FAILED", status: 500 }
}
