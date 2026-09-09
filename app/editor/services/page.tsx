import { redirect } from "next/navigation"
import Link from "next/link"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { Button } from "@/components/ui/button"
import { getUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { shouldEnforcePlanEntitlements } from "@/lib/plan-enforcement"
import { BOOKING_ADDON_NAME, BOOKING_ADDON_MONTHLY_PRICE, formatPrice } from "@/lib/pricing"
import { createClient } from "@/lib/supabase/server"
import { getOrCreateBusiness } from "@/lib/supabase/business"
import {
  getCalendarAvailabilityWindows,
  getCalendarEntries,
  type CalendarAvailabilityWindow,
  type CalendarEntry,
} from "@/lib/supabase/calendar"
import { getServiceBookingSettings } from "@/lib/supabase/booking-settings"
import { createDefaultServiceBookingSettings, type ServiceBookingSettings } from "@/lib/booking/types"
import {
  addLocalDays,
  getServiceAvailabilityPreview,
  localDateForInstant,
  type ServiceAvailabilityPreview,
} from "@/lib/booking/availability"
import { getServices } from "@/lib/supabase/services"
import { ServicesClient } from "@/components/business/services-client"

export const metadata = {
  title: "Aanbod | Website Maker",
  description: "Beheer het aanbod van uw bedrijf",
}

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const business = await getOrCreateBusiness()
  const access = await getUserRuntimeEntitlement(supabase, data.user.id, "service_management")
  if (!access.allowed && shouldEnforcePlanEntitlements()) {
    return (
      <EditorPageShell title="Diensten beheren" description="Beheer het aanbod van uw bedrijf." maxWidth="7xl">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Dienstenbeheer bij Gold</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Diensten beheren is inbegrepen bij Gold. Met {BOOKING_ADDON_NAME} voor {formatPrice(BOOKING_ADDON_MONTHLY_PRICE)} per maand exclusief btw kunt u ook op Bronze en Silver uw boekbare diensten beheren.
          </p>
          <Button asChild className="mt-4"><Link href="/editor/account/billing">Bekijk abonnementen en add-ons</Link></Button>
        </div>
      </EditorPageShell>
    )
  }
  const services = await getServices(business.id)
  let calendarEntries: CalendarEntry[] = []
  let availabilityWindows: CalendarAvailabilityWindow[] = []
  let storedBookingSettings: ServiceBookingSettings[] = []
  let calendarUnavailable = false
  let bookingSettingsUnavailable = false

  try {
    ;[calendarEntries, availabilityWindows] = await Promise.all([
      getCalendarEntries(business.id, { dateFrom: new Date().toISOString() }),
      getCalendarAvailabilityWindows(business.id),
    ])
  } catch (error) {
    console.error("[services] Failed to load calendar entries:", error)
    calendarUnavailable = true
  }

  try {
    storedBookingSettings = await getServiceBookingSettings(business.id)
  } catch (error) {
    console.error("[services] Failed to load booking settings:", error)
    bookingSettingsUnavailable = true
  }

  const storedSettingsByService = new Map(storedBookingSettings.map((settings) => [settings.service_id, settings]))
  const bookingSettings = services.map((service) => storedSettingsByService.get(service.id)
    ?? createDefaultServiceBookingSettings(service.id, business.id, business.category === "bnb" ? "stay" : "appointment"))
  const now = new Date()
  const availabilityPreviews: Record<string, ServiceAvailabilityPreview> = Object.fromEntries(
    bookingSettings.map((settings) => {
      const dateFrom = localDateForInstant(now, settings.timezone)
      return [settings.service_id, getServiceAvailabilityPreview({
        settings,
        windows: availabilityWindows,
        entries: calendarEntries,
        date_from: dateFrom,
        date_to: addLocalDays(dateFrom, 14),
        now,
        limit: 5,
      })]
    }),
  )

  return (
    <ServicesClient
      userId={data.user.id}
      businessId={business.id}
      businessCategory={business.category}
      initialServices={services}
      initialCalendarEntries={calendarEntries}
      calendarUnavailable={calendarUnavailable}
      initialBookingSettings={bookingSettings}
      initialAvailabilityPreviews={availabilityPreviews}
      bookingSettingsUnavailable={bookingSettingsUnavailable}
    />
  )
}
