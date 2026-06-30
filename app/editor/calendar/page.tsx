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
  searchParams: Promise<{ service?: string }>
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
  const services = await getServices(business.id)

  try {
    ;[entries, availabilityWindows] = await Promise.all([
      getCalendarEntries(business.id),
      getCalendarAvailabilityWindows(business.id),
    ])
  } catch (error) {
    console.error("[calendar] Failed to load entries:", error)
    calendarError = "Kalendertabellen zijn nog niet beschikbaar. Voer de calendar_entries migratie uit voordat u boekingen, afspraken of beschikbaarheid beheert."
  }

  const initialOfferingId = services.some((service) => service.id === params?.service)
    ? params.service!
    : null

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
        offerings={services}
        initialOfferingId={initialOfferingId}
        schemaError={calendarError}
        copy={calendarCopy}
        offeringCopy={offeringCopy}
      />
    </EditorPageShell>
  )
}
