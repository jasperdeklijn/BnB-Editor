import type { SupabaseClient } from "@supabase/supabase-js"
import { readAllQueryRows } from "@/lib/supabase/pagination"
import type { ServiceBookingSettings } from "@/lib/booking/types"
import type {
  AvailabilityWindowInput,
  BusyCalendarEntryInput,
} from "@/lib/booking/availability"
import type { AvailabilityException, BookingResource } from "@/lib/booking/cart"

export async function loadBookingPlanning(
  db: SupabaseClient,
  businessId: string,
  excludeCartHold?: string,
  excludeGroup?: string,
) {
  const results = await Promise.all([
    readAllQueryRows(
      db
        .from("service_booking_settings")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("service_id"),
    ),
    readAllQueryRows(
      db
        .from("calendar_availability_windows")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("id"),
    ),
    readAllQueryRows(
      db
        .from("booking_resources")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("id"),
    ),
    readAllQueryRows(
      db
        .from("booking_availability_exceptions")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("id"),
    ),
    readAllQueryRows(
      db
        .from("calendar_entries")
        .select(
          "id, service_id, entry_type, status, start_at, end_at, booking_group_id, booking_resource_id",
          { count: "exact" },
        )
        .eq("business_id", businessId)
        .not("status", "in", "(cancelled,completed)")
        .gt("end_at", new Date(Date.now() - 2 * 86400000).toISOString())
        .lt("start_at", new Date(Date.now() + 732 * 86400000).toISOString())
        .order("id"),
    ),
    readAllQueryRows(
      db
        .from("booking_holds")
        .select(
          "id, service_id, booking_mode, start_at, end_at, cart_hold_id, booking_resource_id",
          { count: "exact" },
        )
        .eq("business_id", businessId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("id"),
    ),
  ])
  for (const result of results)
    if (result.error)
      throw new Error(
        "De dienstenplanning is nog niet beschikbaar. Controleer of de boekingsmigratie is uitgevoerd.",
      )
  const settings = (results[0].data ?? []) as ServiceBookingSettings[]
  const resources = (results[2].data ?? []) as Array<
    BookingResource & {
      timezone: string
      windows: Array<{ weekday: number; start_time: string; end_time: string }>
    }
  >
  const withBuffers = (
    entry: BusyCalendarEntryInput,
  ): BusyCalendarEntryInput => {
    const own = settings.find((row) => row.service_id === entry.service_id)
    return {
      ...entry,
      resource_id:
        (
          entry as BusyCalendarEntryInput & {
            booking_resource_id?: string | null
          }
        ).booking_resource_id ??
        entry.resource_id ??
        own?.resource_id ??
        null,
      buffer_before_minutes: own?.buffer_before_minutes ?? 0,
      buffer_after_minutes: own?.buffer_after_minutes ?? 0,
    }
  }
  const entries: BusyCalendarEntryInput[] = (results[4].data ?? [])
    .filter((entry) => !excludeGroup || entry.booking_group_id !== excludeGroup)
    .map((entry) => withBuffers(entry as BusyCalendarEntryInput))
  entries.push(
    ...(results[5].data ?? [])
      .filter(
        (hold) => !excludeCartHold || hold.cart_hold_id !== excludeCartHold,
      )
      .map((hold) =>
        withBuffers({
          service_id: hold.service_id,
          resource_id: hold.booking_resource_id,
          entry_type: hold.booking_mode === "stay" ? "booking" : "appointment",
          status: "pending",
          start_at: hold.start_at,
          end_at: hold.end_at,
        }),
      ),
  )
  return {
    settings,
    windows: (results[1].data ?? []) as AvailabilityWindowInput[],
    resources,
    resourceWindows: resources.flatMap((resource) =>
      resource.windows.map((window) => ({
        ...window,
        service_id: null,
        resource_id: resource.id,
        timezone: resource.timezone,
        is_active: true,
      })),
    ),
    exceptions: (results[3].data ?? []) as AvailabilityException[],
    entries,
  }
}

export function servicePlanningInput(
  planning: Awaited<ReturnType<typeof loadBookingPlanning>>,
  settings: ServiceBookingSettings,
) {
  const exceptions = planning.exceptions
    .filter((row) => !row.resource_id)
    .flatMap((row) =>
      (row.windows.length
        ? row.windows
        : [{ start_time: "00:00", end_time: "23:59" }]
      ).map((window) => ({
        ...window,
        date: row.date,
        service_id: row.service_id,
        weekday: new Date(`${row.date}T12:00:00Z`).getUTCDay() || 7,
        timezone:
          planning.settings.find(
            (candidate) => candidate.service_id === row.service_id,
          )?.timezone ?? settings.timezone,
        is_active: row.windows.length > 0,
      })),
    )
  const resource = settings.resource_id
    ? planning.resources.find((row) => row.id === settings.resource_id)
    : null
  const resourceExceptions = resource
    ? planning.exceptions
        .filter((row) => row.resource_id === resource.id)
        .flatMap((row) =>
          (row.windows.length
            ? row.windows
            : [{ start_time: "00:00", end_time: "23:59" }]
          ).map((window) => ({
            ...window,
            date: row.date,
            service_id: settings.service_id,
            weekday: new Date(`${row.date}T12:00:00Z`).getUTCDay() || 7,
            timezone: resource.timezone,
            is_active: row.windows.length > 0,
          })),
        )
    : []
  return {
    settings,
    windows: [...planning.windows, ...exceptions],
    entries: planning.entries,
    resource: resource
      ? {
          capacity: resource.capacity,
          windows: [
            ...planning.resourceWindows
              .filter((row) => row.resource_id === resource.id)
              .map((row) => ({ ...row, service_id: settings.service_id })),
            ...exceptions.filter((row) => !row.service_id),
            ...resourceExceptions,
          ],
          entries: planning.entries
            .filter(
              (entry) =>
                !entry.service_id ||
                (entry.resource_id ??
                  planning.settings.find(
                    (candidate) => candidate.service_id === entry.service_id,
                  )?.resource_id) === resource.id,
            )
            .map((entry) => ({
              ...entry,
              service_id: entry.service_id ? settings.service_id : null,
            })),
        }
      : undefined,
  }
}
