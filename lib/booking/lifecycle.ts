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
import { buildCartPlan, type CartPlan } from "@/lib/booking/cart"
import { loadBookingPlanning, servicePlanningInput } from "@/lib/booking/planning-data"

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

export async function getBookingLifecycleData(businessId: string, entryId?: string): Promise<BookingLifecycleData> {
  const supabase = await createClient()
  let historyQuery = supabase.from("booking_status_history").select("*").eq("business_id", businessId)
  let changesQuery = supabase.from("booking_change_requests").select("*").eq("business_id", businessId)
  if (entryId) {
    historyQuery = historyQuery.eq("calendar_entry_id", entryId)
    changesQuery = changesQuery.eq("calendar_entry_id", entryId)
  }
  const [historyResult, changesResult] = await Promise.all([
    historyQuery.order("created_at", { ascending: true }),
    changesQuery.order("created_at", { ascending: false }),
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
  const planning = await loadBookingPlanning(admin, entry.business_id)
  planning.entries = planning.entries.filter((candidate) => (candidate as BusyCalendarEntryInput & { id?: string }).id !== entry.id)
  const settings = planning.settings.find((row) => row.service_id === entry.service_id)
  if (!settings) throw new Error("Beschikbaarheid kon niet worden gecontroleerd.")
  return servicePlanningInput(planning, settings)
}

export async function validateBookingReplacement(entry: OwnedBookingEntry, startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || start <= new Date()) {
    throw new Error("Kies een geldig toekomstig tijdvak.")
  }
  if (entry.booking_group_id) {
    const plan = await groupReplacement(entry, startAt)
    const expectedFirstEnd = plan.items[0].end_at
    if (end.toISOString() !== plan.end_at && end.toISOString() !== expectedFirstEnd) throw new Error("De duur van de volledige boeking blijft gelijk.")
    return
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

async function groupReplacement(entry: OwnedBookingEntry, startAt: string) {
  const admin = await createAdminClient()
  const { data: group, error } = await admin.from("booking_groups").select("leader_id,plan").eq("id", entry.booking_group_id).eq("business_id", entry.business_id).maybeSingle()
  if (error || !group || group.leader_id !== entry.id) throw new Error("Open de volledige boeking om deze te verplaatsen.")
  const previous = group.plan as CartPlan
  const planning = await loadBookingPlanning(admin, entry.business_id, undefined, entry.booking_group_id!)
  const { data: allocations, error: allocationError } = await admin.from("calendar_entries").select("service_id,booking_resource_id").eq("booking_group_id", entry.booking_group_id)
  if (allocationError) throw new Error("De gereserveerde agenda's konden niet worden geladen.")
  planning.settings = planning.settings.map((settings) => {
    const allocation = allocations?.find((item) => item.service_id === settings.service_id)?.booking_resource_id
    return allocation ? { ...settings, resource_id: allocation } : settings
  })
  const date = localDateForInstant(new Date(startAt), previous.timezone)
  const next = buildCartPlan({ ...planning, lines: previous.items, date_from: date, date_to: date }, startAt)
  if (!next) throw new Error("De volledige combinatie past niet op dit tijdstip.")
  return next
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
  const { data, error } = entry.booking_group_id
    ? await supabase.rpc("update_owned_booking_group", { p_entry: entry.id, p_changes: { status, metadata }, p_expected_status: "pending" })
    : await supabase.from("calendar_entries").update({ status, metadata }).eq("id", entry.id).eq("status", "pending").select("*").maybeSingle()
  if (error || !data) throw new Error("De boekingsstatus kon niet worden bijgewerkt.")
  if (status === "confirmed" && entry.contact_request_id) {
    const now = new Date().toISOString()
    const { error: inquiryError } = await supabase
      .from("contact_requests")
      .update({ status: "won", status_changed_at: now, last_activity_at: now, closed_at: now, closed_reason: "Boeking bevestigd" })
      .eq("id", entry.contact_request_id)
      .eq("business_id", entry.business_id)
    if (inquiryError && inquiryError.code !== "42P01" && inquiryError.code !== "42703") {
      console.error("[booking] Booking confirmed but linked enquiry could not be marked won", inquiryError)
    }
  }
  const notification = await deliverBestEffort(entry.id)
  return { entry: data as CalendarEntry, notification }
}

export async function proposeOwnerAlternative(entryId: string, input: { startAt: string; endAt: string; customerMessage: string; privateNote: string }) {
  const { supabase, entry } = await currentOwnerBooking(entryId)
  if (!(["pending", "confirmed"] as string[]).includes(entry.status)) throw new Error("Voor deze boeking kan geen alternatief meer worden voorgesteld.")
  await validateBookingReplacement(entry, input.startAt, input.endAt)
  const endAt = entry.booking_group_id ? (await groupReplacement(entry, input.startAt)).end_at : input.endAt
  const { data, error } = await supabase.from("booking_change_requests").insert({
    calendar_entry_id: entry.id,
    business_id: entry.business_id,
    request_kind: "alternative_proposal",
    requested_by: "owner",
    proposed_start_at: input.startAt,
    proposed_end_at: endAt,
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
  const { data: entryId, error } = await admin.rpc(entry.booking_group_id ? "apply_booking_group_change_request" : "apply_booking_change_request", { p_request_id: requestId, p_actor: "owner", p_resolved_by: user.id })
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
