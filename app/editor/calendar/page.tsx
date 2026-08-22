import { redirect } from "next/navigation"
import { CalendarClient } from "@/components/calendar/calendar-client"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { createClient } from "@/lib/supabase/server"
import { getOrCreateBusiness } from "@/lib/supabase/business"
import {
  getCalendarAvailabilityWindows,
  getCalendarEntries,
  type CalendarAvailabilityWindow,
  type CalendarEntry,
} from "@/lib/supabase/calendar"
import { getServices } from "@/lib/supabase/services"
import { getOfferingCopy } from "@/lib/business/categories"
import { getBookingLifecycleData, type BookingLifecycleData } from "@/lib/booking/lifecycle"
import { getCalendarSyncData, type CalendarSyncData } from "@/lib/calendar/sync"
import { getBookingFinanceData, type BookingFinanceData } from "@/lib/booking/invoicing"
import { getServiceBookingSettings } from "@/lib/supabase/booking-settings"

export const metadata = {
  title: "Kalender | Website Maker",
  description: "Beheer afspraken, boekingen en beschikbaarheid",
}

function getCalendarCopy(category: string | null | undefined) {
  if (category === "bnb") {
    return {
      title: "Boekingskalender",
      description: "Beheer boekingen, check-ins, check-outs en geblokkeerde periodes voor uw accommodaties.",
      emptyTitle: "Nog geen boekingen",
      emptyText: "Nieuwe boekingen, blokkades en notities verschijnen straks in deze kalender.",
      primaryAction: "Boeking toevoegen",
      linkedOfferingLabel: "Accommodatie",
      upcomingTitle: "Aankomende boekingen",
    }
  }

  return {
    title: "Afsprakenkalender",
    description: "Beheer afspraken, aanvragen, geblokkeerde tijden en planning voor uw aanbod.",
    emptyTitle: "Nog geen afspraken",
    emptyText: "Nieuwe afspraken, blokkades en notities verschijnen straks in deze kalender.",
    primaryAction: "Afspraak toevoegen",
    linkedOfferingLabel: "Aanbod",
    upcomingTitle: "Aankomende afspraken",
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; booking?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const business = await getOrCreateBusiness()
  const calendarCopy = getCalendarCopy(business.category)
  const offeringCopy = getOfferingCopy(business.category)

  let entries: CalendarEntry[] = []
  let availabilityWindows: CalendarAvailabilityWindow[] = []
  let calendarError: string | null = null
  let lifecycleData: BookingLifecycleData = { history: [], changeRequests: [] }
  let lifecycleUnavailable = false
  let calendarSyncData: CalendarSyncData = { overviewFeed: null, exportFeeds: [], importSources: [] }
  let calendarSyncUnavailable = false
  let bookingFinanceData: BookingFinanceData = {
    financials: [],
    invoices: [],
    profile: {
      business_id: business.id,
      legal_name: business.name,
      address_line1: business.street || "",
      address_line2: "",
      postal_code: business.postal || "",
      city: business.city || "",
      country_code: (business.country || "NL").slice(0, 2).toUpperCase(),
      email: business.contact_email || "",
      vat_id: "",
      kvk_number: "",
      iban: "",
      default_vat_basis_points: 2100,
      invoice_prefix: "F",
      credit_note_prefix: "CR",
      payment_term_days: 14,
      accent_color: "#16302B",
    },
  }
  let bookingFinanceUnavailable = false
  const services = await getServices(business.id)
  let calendarAccommodations: Array<{ id: string; title: string }> = []

  try {
    const bookingSettings = await getServiceBookingSettings(business.id)
    const stayServiceIds = new Set(bookingSettings.filter((settings) => settings.booking_mode === "stay").map((settings) => settings.service_id))
    calendarAccommodations = services.filter((service) => stayServiceIds.has(service.id)).map((service) => ({ id: service.id, title: service.title }))
  } catch (error) {
    console.error("[calendar] Failed to load accommodation settings:", error)
  }

  try {
    ;[entries, availabilityWindows] = await Promise.all([
      getCalendarEntries(business.id),
      getCalendarAvailabilityWindows(business.id),
    ])
  } catch (error) {
    console.error("[calendar] Failed to load entries:", error)
    calendarError = "Kalendertabellen zijn nog niet beschikbaar. Voer de calendar_entries migratie uit voordat u boekingen, afspraken of beschikbaarheid beheert."
  }

  try {
    lifecycleData = await getBookingLifecycleData(business.id)
  } catch (error) {
    console.error("[calendar] Failed to load booking lifecycle:", error)
    lifecycleUnavailable = true
  }

  try {
    calendarSyncData = await getCalendarSyncData(business.id)
  } catch (error) {
    console.error("[calendar] Failed to load calendar interoperability:", error)
    calendarSyncUnavailable = true
  }

  try {
    bookingFinanceData = await getBookingFinanceData(business.id)
  } catch (error) {
    console.error("[calendar] Failed to load reservation invoicing:", error)
    bookingFinanceUnavailable = true
  }

  const initialOfferingId = services.some((service) => service.id === params?.service)
    ? params.service!
    : null
  const initialEntryId = entries.some((entry) => entry.id === params?.booking) ? params.booking! : null

  return (
    <EditorPageShell
      title={calendarCopy.title}
      description={calendarCopy.description}
      maxWidth="full"
    >
      <CalendarClient
        businessId={business.id}
        businessCategory={business.category ?? ""}
        initialEntries={entries}
        initialAvailabilityWindows={availabilityWindows}
        initialLifecycle={lifecycleData}
        lifecycleUnavailable={lifecycleUnavailable}
        initialCalendarSync={calendarSyncData}
        calendarSyncUnavailable={calendarSyncUnavailable}
        calendarAccommodations={calendarAccommodations}
        initialBookingFinance={bookingFinanceData}
        bookingFinanceUnavailable={bookingFinanceUnavailable}
        offerings={services}
        initialOfferingId={initialOfferingId}
        initialEntryId={initialEntryId}
        schemaError={calendarError}
        copy={calendarCopy}
        offeringCopy={offeringCopy}
      />
    </EditorPageShell>
  )
}
