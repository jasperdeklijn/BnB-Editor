import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { createAdminClient } from "@/lib/supabase/admin"
import type { CartPlan } from "@/lib/booking/cart"

interface CustomerTokenPayload {
  entryId: string
  version: number
  expiresAt: string
}

export interface CustomerBookingHistoryItem {
  id: string
  event_type: string
  actor_type: "customer" | "owner" | "system"
  public_message: string
  proposed_start_at: string | null
  proposed_end_at: string | null
  created_at: string
}

export interface CustomerBookingChangeRequest {
  id: string
  request_kind: "reschedule_request" | "alternative_proposal"
  requested_by: "customer" | "owner"
  proposed_start_at: string
  proposed_end_at: string
  customer_message: string
  status: "pending" | "accepted" | "rejected" | "cancelled"
  created_at: string
}

export interface CustomerBookingView {
  group?: { id: string; items: CartPlan["items"]; paymentInstructions: string }
  entry: {
    id: string
    title: string
    status: "pending" | "confirmed" | "cancelled" | "completed"
    entry_type: "appointment" | "booking"
    customer_name: string
    customer_email: string
    start_at: string
    end_at: string
    timezone: string
    service_id: string
  }
  serviceTitle: string
  businessName: string
  history: CustomerBookingHistoryItem[]
  changeRequests: CustomerBookingChangeRequest[]
  canCancel: boolean
  canRequestReschedule: boolean
  cancellationCutoffMinutes: number
  financial: {
    reservationNumber: string
    currency: string
    settlementStatus: "open" | "paid" | "refunded"
    totalMinor: number
  } | null
  invoices: Array<{
    id: string
    documentType: "invoice" | "credit_note"
    invoiceNumber: string
    status: "issued" | "credited"
    totalMinor: number
    currency: string
    issuedAt: string
  }>
  token: string
}

function bookingLinkSecret() {
  const secret = process.env.BOOKING_LINK_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) throw new Error("BOOKING_LINK_SECRET ontbreekt.")
  return secret
}

function encodePayload(payload: CustomerTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export function createCustomerBookingToken(payload: CustomerTokenPayload) {
  const encoded = encodePayload(payload)
  const signature = createHmac("sha256", bookingLinkSecret()).update(encoded).digest("base64url")
  return `${encoded}.${signature}`
}

export function verifyCustomerBookingToken(token: string): CustomerTokenPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".")
  if (!encoded || !suppliedSignature || extra) return null
  const expected = createHmac("sha256", bookingLinkSecret()).update(encoded).digest()
  let supplied: Buffer
  try {
    supplied = Buffer.from(suppliedSignature, "base64url")
  } catch {
    return null
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CustomerTokenPayload
    if (!parsed.entryId || !Number.isInteger(parsed.version) || !parsed.expiresAt) return null
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export async function createCustomerBookingLink(calendarEntryId: string) {
  const supabase = await createAdminClient()
  const { data: access, error } = await supabase
    .from("booking_customer_access")
    .select("calendar_entry_id, token_version, expires_at, revoked_at")
    .eq("calendar_entry_id", calendarEntryId)
    .maybeSingle()
  if (error || !access || access.revoked_at) throw new Error("Klantlink is niet beschikbaar.")
  const token = createCustomerBookingToken({
    entryId: access.calendar_entry_id,
    version: access.token_version,
    expiresAt: access.expires_at,
  })
  const domain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "FlexPagina.nl"
  return `https://${domain}/booking/${encodeURIComponent(token)}`
}

export async function getCustomerBookingView(token: string): Promise<CustomerBookingView | null> {
  const payload = verifyCustomerBookingToken(token)
  if (!payload) return null
  const supabase = await createAdminClient()
  const { data: access, error: accessError } = await supabase
    .from("booking_customer_access")
    .select("calendar_entry_id, token_version, expires_at, revoked_at")
    .eq("calendar_entry_id", payload.entryId)
    .maybeSingle()
  if (
    accessError || !access || access.revoked_at || access.token_version !== payload.version
    || access.expires_at !== payload.expiresAt || new Date(access.expires_at).getTime() <= Date.now()
  ) return null

  const { data: entry, error: entryError } = await supabase
    .from("calendar_entries")
    .select("id, business_id, service_id, title, status, entry_type, customer_name, customer_email, start_at, end_at, timezone, booking_group_id")
    .eq("id", payload.entryId)
    .maybeSingle()
  if (entryError || !entry || !entry.service_id || !["appointment", "booking"].includes(entry.entry_type)) return null

  const [serviceResult, businessResult, settingsResult, historyResult, changesResult] = await Promise.all([
    supabase.from("services").select("title").eq("id", entry.service_id).maybeSingle(),
    supabase.from("businesses").select("name").eq("id", entry.business_id).maybeSingle(),
    supabase.from("service_booking_settings").select("cancellation_cutoff_minutes").eq("service_id", entry.service_id).maybeSingle(),
    supabase.from("booking_status_history")
      .select("id, event_type, actor_type, public_message, proposed_start_at, proposed_end_at, created_at")
      .eq("calendar_entry_id", entry.id)
      .order("created_at", { ascending: true }),
    supabase.from("booking_change_requests")
      .select("id, request_kind, requested_by, proposed_start_at, proposed_end_at, customer_message, status, created_at")
      .eq("calendar_entry_id", entry.id)
      .order("created_at", { ascending: false }),
  ])
  if (historyResult.error || changesResult.error) return null

  const [financialResult, invoicesResult] = await Promise.all([
    supabase.from("booking_reservation_financials")
      .select("reservation_number, currency, settlement_status, total_minor")
      .eq("calendar_entry_id", entry.id)
      .maybeSingle(),
    supabase.from("booking_invoices")
      .select("id, document_type, invoice_number, status, total_minor, currency, issued_at")
      .eq("calendar_entry_id", entry.id)
      .in("status", ["issued", "credited"])
      .order("issued_at", { ascending: false }),
  ])
  const financial = financialResult.error || !financialResult.data ? null : {
    reservationNumber: financialResult.data.reservation_number,
    currency: financialResult.data.currency,
    settlementStatus: financialResult.data.settlement_status as "open" | "paid" | "refunded",
    totalMinor: Number(financialResult.data.total_minor),
  }
  const invoices = invoicesResult.error ? [] : (invoicesResult.data ?? []).flatMap((invoice) => (
    invoice.invoice_number && invoice.issued_at ? [{
      id: invoice.id,
      documentType: invoice.document_type as "invoice" | "credit_note",
      invoiceNumber: invoice.invoice_number,
      status: invoice.status as "issued" | "credited",
      totalMinor: Number(invoice.total_minor),
      currency: invoice.currency,
      issuedAt: invoice.issued_at,
    }] : []
  ))

  let group: CustomerBookingView["group"]
  let cutoff = Number(settingsResult.data?.cancellation_cutoff_minutes ?? 0)
  if (entry.booking_group_id) {
    const { data: bookingGroup, error } = await supabase.from("booking_groups").select("id,leader_id,plan,payment_instructions").eq("id", entry.booking_group_id).eq("business_id", entry.business_id).maybeSingle()
    if (error || !bookingGroup || bookingGroup.leader_id !== entry.id) return null
    const plan = bookingGroup.plan as CartPlan
    group = { id: bookingGroup.id, items: plan.items, paymentInstructions: bookingGroup.payment_instructions }
    const { data: rules, error: rulesError } = await supabase.from("service_booking_settings").select("service_id,cancellation_cutoff_minutes").in("service_id", plan.items.map((item) => item.service_id))
    if (rulesError || rules?.length !== plan.items.length) return null
    const deadline = Math.min(...plan.items.map((item) => new Date(item.start_at).getTime() - Number(rules.find((rule) => rule.service_id === item.service_id)?.cancellation_cutoff_minutes ?? 0) * 60000))
    cutoff = Math.max(0, (new Date(plan.start_at).getTime() - deadline) / 60000)
    entry.start_at = plan.start_at
    entry.end_at = plan.end_at
  }
  const active = entry.status === "pending" || entry.status === "confirmed"
  const beforeCutoff = Date.now() <= new Date(entry.start_at).getTime() - cutoff * 60_000

  return {
    group,
    entry: entry as CustomerBookingView["entry"],
    serviceTitle: group ? "Jouw boeking" : serviceResult.data?.title || entry.title,
    businessName: businessResult.data?.name || "",
    history: (historyResult.data ?? []) as CustomerBookingHistoryItem[],
    changeRequests: (changesResult.data ?? []) as CustomerBookingChangeRequest[],
    canCancel: active && beforeCutoff,
    canRequestReschedule: active && beforeCutoff,
    cancellationCutoffMinutes: cutoff,
    financial,
    invoices,
    token,
  }
}
