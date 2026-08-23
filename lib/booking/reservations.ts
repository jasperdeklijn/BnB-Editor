import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  CalendarEntry,
  CalendarEntrySource,
  CalendarEntryStatus,
  CalendarEntryType,
} from "@/lib/supabase/calendar"
import type { ReservationFinancial, SettlementStatus } from "@/lib/booking/invoicing"

export const RESERVATION_PAGE_SIZE = 25

export type ReservationStatusFilter = "all" | CalendarEntryStatus
export type ReservationTypeFilter = "all" | Extract<CalendarEntryType, "appointment" | "booking">
export type ReservationSourceFilter = "all" | CalendarEntrySource
export type ReservationSettlementFilter = "all" | SettlementStatus
export type ReservationSort = "created_desc" | "start_asc" | "start_desc"

export interface ReservationOverviewFilters {
  query: string
  status: ReservationStatusFilter
  serviceId: string
  source: ReservationSourceFilter
  type: ReservationTypeFilter
  settlement: ReservationSettlementFilter
  dateFrom: string
  dateTo: string
  sort: ReservationSort
  page: number
}

export interface ReservationOverviewItem {
  entry: CalendarEntry
  offering_title: string | null
  financial: ReservationFinancial | null
}

export type ReservationStatusCounts = Record<CalendarEntryStatus, number>

export interface ReservationOverviewResult {
  items: ReservationOverviewItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  statusCounts: ReservationStatusCounts
  financeUnavailable: boolean
}

type SearchParamsValue = string | string[] | undefined

const STATUSES: CalendarEntryStatus[] = ["pending", "confirmed", "cancelled", "completed", "blocked"]
const SOURCES: CalendarEntrySource[] = ["manual", "website_form", "contact_request", "import"]
const TYPES: ReservationTypeFilter[] = ["all", "appointment", "booking"]
const SETTLEMENTS: ReservationSettlementFilter[] = ["all", "open", "paid", "refunded"]
const SORTS: ReservationSort[] = ["created_desc", "start_asc", "start_desc"]

function firstParam(value: SearchParamsValue) {
  return Array.isArray(value) ? value[0] : value
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : ""
}

export function parseReservationOverviewFilters(
  params: Record<string, SearchParamsValue>,
): ReservationOverviewFilters {
  const rawStatus = firstParam(params.status)
  const rawSource = firstParam(params.source)
  const rawType = firstParam(params.type)
  const rawSettlement = firstParam(params.settlement)
  const rawSort = firstParam(params.sort)
  const rawPage = Number(firstParam(params.page))

  return {
    query: (firstParam(params.query) ?? "").trim().slice(0, 120),
    status: rawStatus && STATUSES.includes(rawStatus as CalendarEntryStatus)
      ? rawStatus as CalendarEntryStatus
      : "all",
    serviceId: (firstParam(params.service) ?? "").trim().slice(0, 80),
    source: rawSource && SOURCES.includes(rawSource as CalendarEntrySource)
      ? rawSource as CalendarEntrySource
      : "all",
    type: rawType && TYPES.includes(rawType as ReservationTypeFilter)
      ? rawType as ReservationTypeFilter
      : "all",
    settlement: rawSettlement && SETTLEMENTS.includes(rawSettlement as ReservationSettlementFilter)
      ? rawSettlement as ReservationSettlementFilter
      : "all",
    dateFrom: validDate(firstParam(params.from)),
    dateTo: validDate(firstParam(params.to)),
    sort: rawSort && SORTS.includes(rawSort as ReservationSort)
      ? rawSort as ReservationSort
      : "created_desc",
    page: Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100_000) : 1,
  }
}

function parseEntry(row: Record<string, unknown>): CalendarEntry {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    service_id: typeof row.service_id === "string" ? row.service_id : null,
    contact_request_id: typeof row.contact_request_id === "string" ? row.contact_request_id : null,
    entry_type: row.entry_type as CalendarEntryType,
    status: row.status as CalendarEntryStatus,
    source: row.source as CalendarEntrySource,
    title: String(row.title ?? ""),
    customer_name: String(row.customer_name ?? ""),
    customer_email: String(row.customer_email ?? ""),
    customer_phone: String(row.customer_phone ?? ""),
    start_at: String(row.start_at),
    end_at: String(row.end_at),
    all_day: Boolean(row.all_day),
    timezone: String(row.timezone || "Europe/Amsterdam"),
    internal_notes: String(row.internal_notes ?? ""),
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseFinancial(row: Record<string, unknown>): ReservationFinancial {
  return {
    calendar_entry_id: String(row.calendar_entry_id),
    business_id: String(row.business_id),
    reservation_number: String(row.reservation_number),
    currency: String(row.currency || "EUR"),
    pricing_status: row.pricing_status === "ready" ? "ready" : "needs_review",
    settlement_status: row.settlement_status === "paid" || row.settlement_status === "refunded"
      ? row.settlement_status
      : "open",
    line_items: Array.isArray(row.line_items) ? row.line_items as ReservationFinancial["line_items"] : [],
    subtotal_minor: numberValue(row.subtotal_minor),
    vat_total_minor: numberValue(row.vat_total_minor),
    total_minor: numberValue(row.total_minor),
    priced_at: typeof row.priced_at === "string" ? row.priced_at : null,
  }
}

function safeSearchTerm(value: string) {
  return value.replace(/[(),."]/g, " ").replace(/[%_]/g, " ").replace(/\s+/g, " ").trim()
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

async function assertOwnedBusiness(businessId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Niet ingelogd.")

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error || !data) throw new Error("Bedrijf niet gevonden.")
  return supabase
}

export async function getReservationsOverview(
  businessId: string,
  filters: ReservationOverviewFilters,
): Promise<ReservationOverviewResult> {
  const supabase = await assertOwnedBusiness(businessId)
  const searchTerm = safeSearchTerm(filters.query) || (filters.query ? "no-match-token" : "")
  let financeUnavailable = false
  let financialSearchIds: string[] = []
  let settlementEntryIds: string[] | null = null

  const [financialSearchResult, settlementResult] = await Promise.all([
    searchTerm
      ? supabase
        .from("booking_reservation_financials")
        .select("calendar_entry_id")
        .eq("business_id", businessId)
        .ilike("reservation_number", `%${searchTerm}%`)
      : Promise.resolve({ data: [], error: null }),
    filters.settlement !== "all"
      ? supabase
      .from("booking_reservation_financials")
      .select("calendar_entry_id")
      .eq("business_id", businessId)
        .eq("settlement_status", filters.settlement)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (financialSearchResult.error || settlementResult.error) financeUnavailable = true
  if (!financialSearchResult.error) {
    financialSearchIds = (financialSearchResult.data ?? []).map((row) => String(row.calendar_entry_id))
  }
  if (filters.settlement !== "all") {
    settlementEntryIds = settlementResult.error
      ? []
      : (settlementResult.data ?? []).map((row) => String(row.calendar_entry_id))
  }

  const forceEmpty = filters.settlement !== "all" && settlementEntryIds?.length === 0
  const searchParts = searchTerm
    ? [
        `customer_name.ilike.%${searchTerm}%`,
        `customer_email.ilike.%${searchTerm}%`,
        `customer_phone.ilike.%${searchTerm}%`,
        `title.ilike.%${searchTerm}%`,
        ...(financialSearchIds.length ? [`id.in.(${financialSearchIds.join(",")})`] : []),
      ]
    : []

  const applyFilters = (status?: CalendarEntryStatus) => {
    let query = supabase
      .from("calendar_entries")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .in("entry_type", ["appointment", "booking"])
      .neq("source", "import")

    if (forceEmpty) query = query.eq("id", "00000000-0000-0000-0000-000000000000")
    if (status) query = query.eq("status", status)
    if (filters.serviceId) query = query.eq("service_id", filters.serviceId)
    if (filters.source !== "all") query = query.eq("source", filters.source)
    if (filters.type !== "all") query = query.eq("entry_type", filters.type)
    if (filters.dateFrom) query = query.gte("end_at", `${filters.dateFrom}T00:00:00.000Z`)
    if (filters.dateTo) query = query.lt("start_at", nextDate(filters.dateTo))
    if (filters.settlement !== "all" && settlementEntryIds?.length) query = query.in("id", settlementEntryIds)
    if (searchParts.length) query = query.or(searchParts.join(","))
    return query
  }

  const sortedPageQuery = () => {
    const query = applyFilters(filters.status === "all" ? undefined : filters.status)
    if (filters.sort === "start_asc") return query.order("start_at", { ascending: true }).order("id", { ascending: true })
    if (filters.sort === "start_desc") return query.order("start_at", { ascending: false }).order("id", { ascending: false })
    return query.order("created_at", { ascending: false }).order("id", { ascending: false })
  }

  const rangeStart = (filters.page - 1) * RESERVATION_PAGE_SIZE
  const [initialPageResult, ...countResults] = await Promise.all([
    sortedPageQuery().range(rangeStart, rangeStart + RESERVATION_PAGE_SIZE - 1),
    ...STATUSES.map((status) => applyFilters(status).limit(0)),
  ])

  if (initialPageResult.error) throw initialPageResult.error
  const countError = countResults.find((result) => result.error)?.error
  if (countError) throw countError

  const total = initialPageResult.count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / RESERVATION_PAGE_SIZE))
  const page = Math.min(filters.page, pageCount)
  let pageRows = initialPageResult.data ?? []
  if (page !== filters.page) {
    const fallbackStart = (page - 1) * RESERVATION_PAGE_SIZE
    const fallbackResult = await sortedPageQuery().range(fallbackStart, fallbackStart + RESERVATION_PAGE_SIZE - 1)
    if (fallbackResult.error) throw fallbackResult.error
    pageRows = fallbackResult.data ?? []
  }

  const rows = pageRows as Array<Record<string, unknown>>
  const entryIds = rows.map((row) => String(row.id))
  const serviceIds = [...new Set(rows.map((row) => row.service_id).filter((id): id is string => typeof id === "string"))]

  const [servicesResult, financialsResult] = await Promise.all([
    serviceIds.length
      ? supabase.from("services").select("id, title").eq("business_id", businessId).in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
    entryIds.length && !financeUnavailable
      ? supabase.from("booking_reservation_financials").select("*").eq("business_id", businessId).in("calendar_entry_id", entryIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (servicesResult.error) throw servicesResult.error
  if (financialsResult.error) financeUnavailable = true
  const serviceTitles = new Map((servicesResult.data ?? []).map((row) => [String(row.id), String(row.title)]))
  const financials = new Map(
    (financialsResult.data ?? []).map((row) => {
      const financial = parseFinancial(row as Record<string, unknown>)
      return [financial.calendar_entry_id, financial] as const
    }),
  )
  const statusCounts = Object.fromEntries(
    STATUSES.map((status, index) => [status, countResults[index]?.count ?? 0]),
  ) as ReservationStatusCounts

  return {
    items: rows.map((row) => {
      const entry = parseEntry(row)
      return {
        entry,
        offering_title: entry.service_id ? serviceTitles.get(entry.service_id) ?? null : null,
        financial: financials.get(entry.id) ?? null,
      }
    }),
    total,
    page,
    pageSize: RESERVATION_PAGE_SIZE,
    pageCount,
    statusCounts,
    financeUnavailable,
  }
}

export async function getOwnedReservation(businessId: string, entryId: string): Promise<CalendarEntry | null> {
  const supabase = await assertOwnedBusiness(businessId)
  const { data, error } = await supabase
    .from("calendar_entries")
    .select("*")
    .eq("id", entryId)
    .eq("business_id", businessId)
    .in("entry_type", ["appointment", "booking"])
    .neq("source", "import")
    .maybeSingle()
  if (error) throw error
  return data ? parseEntry(data as Record<string, unknown>) : null
}

export function isValidReservationTransition(from: CalendarEntryStatus, to: CalendarEntryStatus) {
  if (from === "pending") return to === "confirmed" || to === "cancelled"
  if (from === "confirmed") return to === "completed" || to === "cancelled"
  return false
}
