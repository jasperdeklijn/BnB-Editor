"use server"

import { createClient } from "@/lib/supabase/server"

export type CalendarEntryType = "appointment" | "booking" | "blocked" | "note"
export type CalendarEntryStatus = "pending" | "confirmed" | "cancelled" | "completed" | "blocked"
export type CalendarEntrySource = "manual" | "website_form" | "contact_request" | "import"

export interface CalendarEntry {
  id: string
  business_id: string
  service_id: string | null
  contact_request_id: string | null
  entry_type: CalendarEntryType
  status: CalendarEntryStatus
  source: CalendarEntrySource
  title: string
  customer_name: string
  customer_email: string
  customer_phone: string
  start_at: string
  end_at: string
  all_day: boolean
  timezone: string
  internal_notes: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CalendarEntryInput {
  service_id?: string | null
  contact_request_id?: string | null
  entry_type?: CalendarEntryType
  status?: CalendarEntryStatus
  source?: CalendarEntrySource
  title?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  start_at: string
  end_at: string
  all_day?: boolean
  timezone?: string
  internal_notes?: string
  metadata?: Record<string, unknown>
}

export type CalendarEntryUpdate = Partial<CalendarEntryInput>

export interface CalendarAvailabilityWindow {
  id: string
  business_id: string
  service_id: string | null
  weekday: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CalendarAvailabilityWindowInput {
  service_id?: string | null
  weekday: number
  start_time: string
  end_time: string
  timezone?: string
  is_active?: boolean
}

export interface CalendarEntryFilters {
  serviceId?: string | null
  status?: CalendarEntryStatus
  source?: CalendarEntrySource
  dateFrom?: string
  dateTo?: string
}

type CalendarEntryRow = {
  id: string
  business_id: string
  service_id: string | null
  contact_request_id: string | null
  entry_type: CalendarEntryType
  status: CalendarEntryStatus
  source: CalendarEntrySource
  title: string
  customer_name: string
  customer_email: string
  customer_phone: string
  start_at: string
  end_at: string
  all_day: boolean
  timezone: string
  internal_notes: string
  metadata: unknown
  created_at: string
  updated_at: string
}

type CalendarAvailabilityWindowRow = {
  id: string
  business_id: string
  service_id: string | null
  weekday: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_TIMEZONE = "Europe/Amsterdam"

function parseCalendarEntry(row: CalendarEntryRow): CalendarEntry {
  return {
    id: row.id,
    business_id: row.business_id,
    service_id: row.service_id,
    contact_request_id: row.contact_request_id,
    entry_type: row.entry_type,
    status: row.status,
    source: row.source,
    title: row.title,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    start_at: row.start_at,
    end_at: row.end_at,
    all_day: row.all_day,
    timezone: row.timezone,
    internal_notes: row.internal_notes,
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function parseCalendarAvailabilityWindow(row: CalendarAvailabilityWindowRow): CalendarAvailabilityWindow {
  return {
    id: row.id,
    business_id: row.business_id,
    service_id: row.service_id,
    weekday: row.weekday,
    start_time: row.start_time,
    end_time: row.end_time,
    timezone: row.timezone,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toCalendarEntryPayload(input: Partial<CalendarEntryInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (input.service_id !== undefined) payload.service_id = input.service_id
  if (input.contact_request_id !== undefined) payload.contact_request_id = input.contact_request_id
  if (input.entry_type !== undefined) payload.entry_type = input.entry_type
  if (input.status !== undefined) payload.status = input.status
  if (input.source !== undefined) payload.source = input.source
  if (input.title !== undefined) payload.title = input.title
  if (input.customer_name !== undefined) payload.customer_name = input.customer_name
  if (input.customer_email !== undefined) payload.customer_email = input.customer_email
  if (input.customer_phone !== undefined) payload.customer_phone = input.customer_phone
  if (input.start_at !== undefined) payload.start_at = input.start_at
  if (input.end_at !== undefined) payload.end_at = input.end_at
  if (input.all_day !== undefined) payload.all_day = input.all_day
  if (input.timezone !== undefined) payload.timezone = input.timezone
  if (input.internal_notes !== undefined) payload.internal_notes = input.internal_notes
  if (input.metadata !== undefined) payload.metadata = input.metadata

  return payload
}

async function requireCurrentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error("Not authenticated")
  return user.id
}

async function assertOwnedBusiness(
  businessId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const userId = await requireCurrentUserId(supabase)
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Business not found")
}

async function assertLinkedServiceBelongsToBusiness(
  serviceId: string | null | undefined,
  businessId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  if (!serviceId) return

  const { data, error } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Linked offering not found")
}

async function assertLinkedContactRequestBelongsToBusiness(
  contactRequestId: string | null | undefined,
  businessId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  if (!contactRequestId) return

  const { data, error } = await supabase
    .from("contact_requests")
    .select("id")
    .eq("id", contactRequestId)
    .eq("business_id", businessId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Linked request not found")
}

async function getOwnedCalendarEntryRow(
  entryId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CalendarEntryRow> {
  const { data, error } = await supabase
    .from("calendar_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Calendar entry not found")

  const row = data as CalendarEntryRow
  await assertOwnedBusiness(row.business_id, supabase)
  return row
}

export async function getCalendarEntries(
  businessId: string,
  filters: CalendarEntryFilters = {},
): Promise<CalendarEntry[]> {
  const supabase = await createClient()
  await assertOwnedBusiness(businessId, supabase)

  let query = supabase
    .from("calendar_entries")
    .select("*")
    .eq("business_id", businessId)
    .order("start_at", { ascending: true })

  if (filters.serviceId !== undefined) {
    if (filters.serviceId === null) {
      query = query.is("service_id", null)
    } else {
      query = query.eq("service_id", filters.serviceId)
    }
  }
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.source) query = query.eq("source", filters.source)
  if (filters.dateFrom) query = query.gte("end_at", filters.dateFrom)
  if (filters.dateTo) query = query.lte("start_at", filters.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as CalendarEntryRow[]).map(parseCalendarEntry)
}

export async function createCalendarEntry(
  businessId: string,
  input: CalendarEntryInput,
): Promise<CalendarEntry> {
  const supabase = await createClient()
  await assertOwnedBusiness(businessId, supabase)
  await assertLinkedServiceBelongsToBusiness(input.service_id, businessId, supabase)
  await assertLinkedContactRequestBelongsToBusiness(input.contact_request_id, businessId, supabase)

  const payload = {
    business_id: businessId,
    service_id: input.service_id ?? null,
    contact_request_id: input.contact_request_id ?? null,
    entry_type: input.entry_type ?? "appointment",
    status: input.status ?? "pending",
    source: input.source ?? "manual",
    title: input.title ?? "",
    customer_name: input.customer_name ?? "",
    customer_email: input.customer_email ?? "",
    customer_phone: input.customer_phone ?? "",
    start_at: input.start_at,
    end_at: input.end_at,
    all_day: input.all_day ?? false,
    timezone: input.timezone || DEFAULT_TIMEZONE,
    internal_notes: input.internal_notes ?? "",
    metadata: input.metadata ?? {},
  }

  const { data, error } = await supabase
    .from("calendar_entries")
    .insert(payload)
    .select("*")
    .single()

  if (error) throw error
  return parseCalendarEntry(data as CalendarEntryRow)
}

export async function updateCalendarEntry(
  entryId: string,
  updates: CalendarEntryUpdate,
): Promise<CalendarEntry> {
  const supabase = await createClient()
  const existing = await getOwnedCalendarEntryRow(entryId, supabase)

  const nextServiceId = updates.service_id !== undefined ? updates.service_id : existing.service_id
  const nextContactRequestId =
    updates.contact_request_id !== undefined ? updates.contact_request_id : existing.contact_request_id

  await assertLinkedServiceBelongsToBusiness(nextServiceId, existing.business_id, supabase)
  await assertLinkedContactRequestBelongsToBusiness(nextContactRequestId, existing.business_id, supabase)

  const { data, error } = await supabase
    .from("calendar_entries")
    .update(toCalendarEntryPayload(updates))
    .eq("id", entryId)
    .select("*")
    .single()

  if (error) throw error
  return parseCalendarEntry(data as CalendarEntryRow)
}

export async function updateCalendarEntryStatus(
  entryId: string,
  status: CalendarEntryStatus,
): Promise<CalendarEntry> {
  return updateCalendarEntry(entryId, { status })
}

export async function deleteCalendarEntry(entryId: string): Promise<void> {
  const supabase = await createClient()
  await getOwnedCalendarEntryRow(entryId, supabase)

  const { error } = await supabase.from("calendar_entries").delete().eq("id", entryId)
  if (error) throw error
}

export async function getCalendarAvailabilityWindows(
  businessId: string,
): Promise<CalendarAvailabilityWindow[]> {
  const supabase = await createClient()
  await assertOwnedBusiness(businessId, supabase)

  const { data, error } = await supabase
    .from("calendar_availability_windows")
    .select("*")
    .eq("business_id", businessId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true })

  if (error) throw error
  return ((data ?? []) as CalendarAvailabilityWindowRow[]).map(parseCalendarAvailabilityWindow)
}

export async function createCalendarAvailabilityWindow(
  businessId: string,
  input: CalendarAvailabilityWindowInput,
): Promise<CalendarAvailabilityWindow> {
  const supabase = await createClient()
  await assertOwnedBusiness(businessId, supabase)
  await assertLinkedServiceBelongsToBusiness(input.service_id, businessId, supabase)

  const payload = {
    business_id: businessId,
    service_id: input.service_id ?? null,
    weekday: input.weekday,
    start_time: input.start_time,
    end_time: input.end_time,
    timezone: input.timezone || DEFAULT_TIMEZONE,
    is_active: input.is_active ?? true,
  }

  const { data, error } = await supabase
    .from("calendar_availability_windows")
    .insert(payload)
    .select("*")
    .single()

  if (error) throw error
  return parseCalendarAvailabilityWindow(data as CalendarAvailabilityWindowRow)
}

export async function deleteCalendarAvailabilityWindow(windowId: string): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("calendar_availability_windows")
    .select("business_id")
    .eq("id", windowId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Availability window not found")
  await assertOwnedBusiness((data as { business_id: string }).business_id, supabase)

  const { error: deleteError } = await supabase
    .from("calendar_availability_windows")
    .delete()
    .eq("id", windowId)

  if (deleteError) throw deleteError
}
