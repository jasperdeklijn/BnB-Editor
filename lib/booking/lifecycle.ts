import "server-only"

import {
  checkStayAvailability,
  getAppointmentAvailability,
  localDateForInstant,
  type BusyCalendarEntryInput,
} from "@/lib/booking/availability"
import { deliverBookingNotifications } from "@/lib/booking/notifications"
import { assertCurrentUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { CalendarEntry } from "@/lib/supabase/calendar"

export interface BookingHistoryItem {
  id: string
  calendar_entry_id: string
  event_type: string
  actor_type: "customer" | "owner" | "system"
  public_message: string
  private_note: string
  proposed_start_at: string | null
  proposed_end_at: string | null
  created_at: string
}

export interface BookingChangeRequest {
  id: string
  calendar_entry_id: string
  request_kind: "reschedule_request" | "alternative_proposal"
  requested_by: "customer" | "owner"
  proposed_start_at: string
  proposed_end_at: string
  customer_message: string
  private_note: string
  status: "pending" | "accepted" | "rejected" | "cancelled"
  created_at: string
}

export interface BookingLifecycleData {
  history: BookingHistoryItem[]
  changeRequests: BookingChangeRequest[]
}

type OwnedBookingEntry = CalendarEntry & { metadata: Record<string, unknown> }

async function currentOwnerBooking(entryId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Niet ingelogd.")
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const { data, error } = await supabase.from("calendar_entries").select("*").eq("id", entryId).maybeSingle()
  if (error || !data) throw new Error("Boeking niet gevonden.")
  const entry = data as OwnedBookingEntry
  if (entry.metadata?.source !== "booking_engine") throw new Error("Deze actie is alleen beschikbaar voor online boekingen.")
  return { supabase, user, entry }
}

export async function getBookingLifecycleData(businessId: string): Promise<BookingLifecycleData> {
  const supabase = await createClient()
  const [historyResult, changesResult] = await Promise.all([
    supabase.from("booking_status_history").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    supabase.from("booking_change_requests").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ])
  if (historyResult.error || changesResult.error) throw historyResult.error || changesResult.error
  return {
    history: (historyResult.data ?? []) as BookingHistoryItem[],
    changeRequests: (changesResult.data ?? []) as BookingChangeRequest[],
  }
}

async function availabilityInputs(entry: OwnedBookingEntry) {
  if (!entry.service_id) throw new Error("Deze boeking heeft geen gekoppelde dienst.")
  const admin = await createAdminClient()
  const [settingsResult, windowsResult, entriesResult, holdsResult] = await Promise.all([
    admin.from("service_booking_settings").select("*").eq("service_id", entry.service_id).eq("business_id", entry.business_id).maybeSingle(),
    admin.from("calendar_availability_windows").select("service_id, weekday, start_time, end_time, timezone, is_active").eq("business_id", entry.business_id),
    admin.from("calendar_entries").select("id, service_id, entry_type, status, start_at, end_at").eq("business_id", entry.business_id),
    admin.from("booking_holds").select("service_id, booking_mode, start_at, end_at").eq("service_id", entry.service_id).eq("status", "active").gt("expires_at", new Date().toISOString()),
  ])
  if (!settingsResult.data || settingsResult.error || windowsResult.error || entriesResult.error || holdsResult.error) {
    throw new Error("Beschikbaarheid kon niet worden gecontroleerd.")
  }
  const entries: BusyCalendarEntryInput[] = (entriesResult.data ?? [])
    .filter((candidate) => candidate.id !== entry.id)
    .map(({ service_id, entry_type, status, start_at, end_at }) => ({ service_id, entry_type, status, start_at, end_at })) as BusyCalendarEntryInput[]
  entries.push(...(holdsResult.data ?? []).map((hold) => ({
    service_id: hold.service_id,
    entry_type: hold.booking_mode === "stay" ? "booking" as const : "appointment" as const,
    status: "pending" as const,
    start_at: hold.start_at,
    end_at: hold.end_at,
  })))
  return { settings: settingsResult.data, windows: windowsResult.data ?? [], entries }
}

export async function validateBookingReplacement(entry: OwnedBookingEntry, startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || start <= new Date()) {
    throw new Error("Kies een geldig toekomstig tijdvak.")
  }
  const input = await availabilityInputs(entry)
  if (input.settings.booking_mode === "appointment") {
    const date = localDateForInstant(start, input.settings.timezone)
    const exact = getAppointmentAvailability({ ...input, date_from: date, date_to: date, limit: 192 })
      .some((slot) => slot.start_at === start.toISOString() && slot.end_at === end.toISOString())
    if (!exact) throw new Error("Dit alternatieve tijdstip is niet beschikbaar.")
  } else {
    const arrival = localDateForInstant(start, input.settings.timezone)
    const departure = localDateForInstant(end, input.settings.timezone)
    const check = checkStayAvailability({ ...input, arrival_date: arrival, departure_date: departure })
    if (!check.available || check.start_at !== start.toISOString() || check.end_at !== end.toISOString()) {
      throw new Error("Deze alternatieve verblijfsperiode is niet beschikbaar.")
    }
  }
}

export async function validateBookingReplacementById(entryId: string, startAt: string, endAt: string) {
  const admin = await createAdminClient()
  const { data, error } = await admin.from("calendar_entries").select("*").eq("id", entryId).maybeSingle()
  if (error || !data) throw new Error("Boeking niet gevonden.")
  await validateBookingReplacement(data as OwnedBookingEntry, startAt, endAt)
  return data as OwnedBookingEntry
}

async function deliverBestEffort(entryId: string) {
  try {
    return await deliverBookingNotifications(entryId)
  } catch (error) {
    console.error("[booking] Lifecycle saved but notification dispatch failed", error)
    return { sent: 0, failed: 1, skipped: 0 }
  }
}

export async function transitionOwnerBooking(entryId: string, status: "confirmed" | "cancelled", privateNote = "") {
  const { supabase, entry } = await currentOwnerBooking(entryId)
  if (entry.status !== "pending") throw new Error("Alleen een openstaande aanvraag kan worden beoordeeld.")
  const metadata = {
    ...entry.metadata,
    lifecycle_actor: "owner",
    lifecycle_private_note: privateNote.slice(0, 2000),
  }
  const { data, error } = await supabase.from("calendar_entries").update({ status, metadata }).eq("id", entry.id).eq("status", "pending").select("*").maybeSingle()
  if (error || !data) throw new Error("De boekingsstatus kon niet worden bijgewerkt.")
  const notification = await deliverBestEffort(entry.id)
  return { entry: data as CalendarEntry, notification }
}

export async function proposeOwnerAlternative(entryId: string, input: { startAt: string; endAt: string; customerMessage: string; privateNote: string }) {
  const { supabase, entry } = await currentOwnerBooking(entryId)
  if (!(["pending", "confirmed"] as string[]).includes(entry.status)) throw new Error("Voor deze boeking kan geen alternatief meer worden voorgesteld.")
  await validateBookingReplacement(entry, input.startAt, input.endAt)
  const { data, error } = await supabase.from("booking_change_requests").insert({
    calendar_entry_id: entry.id,
    business_id: entry.business_id,
    request_kind: "alternative_proposal",
    requested_by: "owner",
    proposed_start_at: input.startAt,
    proposed_end_at: input.endAt,
    customer_message: input.customerMessage.slice(0, 1000),
    private_note: input.privateNote.slice(0, 2000),
  }).select("*").single()
  if (error || !data) {
    if (error?.code === "23505") throw new Error("Er staat al een alternatief voorstel open.")
    throw new Error("Het alternatieve tijdstip kon niet worden voorgesteld.")
  }
  const notification = await deliverBestEffort(entry.id)
  return { request: data as BookingChangeRequest, notification }
}

export async function acceptCustomerRescheduleRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Niet ingelogd.")
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const { data: request } = await supabase.from("booking_change_requests").select("*, calendar_entries(*)").eq("id", requestId).maybeSingle()
  if (!request?.calendar_entries) throw new Error("Verplaatsingsverzoek niet gevonden.")
  const entry = request.calendar_entries as unknown as OwnedBookingEntry
  await validateBookingReplacement(entry, request.proposed_start_at, request.proposed_end_at)
  const admin = await createAdminClient()
  const { data: entryId, error } = await admin.rpc("apply_booking_change_request", { p_request_id: requestId, p_actor: "owner", p_resolved_by: user.id })
  if (error || !entryId) throw new Error(error?.message.includes("BOOKING_SLOT_UNAVAILABLE") ? "Dit tijdstip is niet meer beschikbaar." : "Het verplaatsingsverzoek kon niet worden toegepast.")
  const { data: updated } = await admin.from("calendar_entries").select("*").eq("id", entryId).single()
  const notification = await deliverBestEffort(entryId)
  return { entry: updated as CalendarEntry, notification }
}

export async function rejectCustomerRescheduleRequest(requestId: string, privateNote = "") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Niet ingelogd.")
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const { data: request } = await supabase.from("booking_change_requests").select("id, calendar_entry_id, requested_by").eq("id", requestId).eq("status", "pending").maybeSingle()
  if (!request || request.requested_by !== "customer") throw new Error("Verplaatsingsverzoek niet gevonden.")
  const admin = await createAdminClient()
  const { data: entryId, error } = await admin.rpc("reject_booking_change_request", { p_request_id: request.id, p_resolved_by: user.id, p_private_note: privateNote.slice(0, 2000) })
  if (error || !entryId) throw new Error("Het verzoek kon niet worden afgewezen.")
  const notification = await deliverBestEffort(entryId)
  return { requestId, notification }
}
