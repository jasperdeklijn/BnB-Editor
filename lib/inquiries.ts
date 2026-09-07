import "server-only"

import nodemailer from "nodemailer"

import { logAuditEvent } from "@/lib/audit-log"
import { PLATFORM_EMAILS } from "@/lib/platform"
import { createClient } from "@/lib/supabase/server"

export const INQUIRY_STATUSES = [
  "new",
  "in_progress",
  "awaiting_customer",
  "won",
  "lost",
  "spam",
  "archived",
] as const

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "Nieuw",
  in_progress: "In behandeling",
  awaiting_customer: "Wacht op klant",
  won: "Gewonnen",
  lost: "Verloren",
  spam: "Spam",
  archived: "Archief",
}

export interface InquiryRecord {
  id: string
  website_id: string | null
  business_id: string | null
  user_id: string | null
  request_type: "contact" | "quote" | "appointment" | "booking_request" | "whatsapp"
  name: string
  email: string
  phone: string
  service: string
  preferred_date: string
  budget: string
  message: string
  locale: string
  recipient_email: string
  source: string
  status: InquiryStatus
  status_changed_at: string
  last_activity_at: string
  last_replied_at: string | null
  follow_up_at: string | null
  closed_at: string | null
  closed_reason: string
  owner_notes: string
  created_at: string
  updated_at: string
}

export interface InquiryMessage {
  id: string
  direction: "inbound" | "outbound"
  sender_email: string
  sender_name: string
  recipient_email: string
  subject: string
  body: string
  delivery_status: "received" | "queued" | "sent" | "failed"
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export interface InquiryActivity {
  id: string
  event_type: "status_changed" | "note_added" | "follow_up_set" | "reply_sent"
  body: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface InquiryCalendarLink {
  id: string
  status: string
  entry_type: string
  start_at: string
  end_at: string
}

export interface InquiryListItem extends InquiryRecord {
  calendarEntry: InquiryCalendarLink | null
}

export interface InquiryOverview {
  items: InquiryListItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  counts: Record<InquiryStatus, number>
  followUpDue: number
}

export interface InquiryDetail {
  inquiry: InquiryRecord
  messages: InquiryMessage[]
  activities: InquiryActivity[]
  calendarEntry: InquiryCalendarLink | null
}

export interface InquiryReplyTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export interface InquiryFilters {
  page?: number
  pageSize?: number
  status?: InquiryStatus | "all"
  requestType?: InquiryRecord["request_type"] | "all"
  search?: string
  service?: string
  source?: string | "all"
  dateFrom?: string
  dateTo?: string
  dueOnly?: boolean
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && INQUIRY_STATUSES.includes(value as InquiryStatus)
}

function normalizeRecord(row: Record<string, unknown>): InquiryRecord {
  return {
    id: String(row.id),
    website_id: typeof row.website_id === "string" ? row.website_id : null,
    business_id: typeof row.business_id === "string" ? row.business_id : null,
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    request_type: (typeof row.request_type === "string" ? row.request_type : "contact") as InquiryRecord["request_type"],
    name: typeof row.name === "string" ? row.name : "",
    email: typeof row.email === "string" ? row.email : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    service: typeof row.service === "string" ? row.service : "",
    preferred_date: typeof row.preferred_date === "string" ? row.preferred_date : "",
    budget: typeof row.budget === "string" ? row.budget : "",
    message: typeof row.message === "string" ? row.message : "",
    locale: typeof row.locale === "string" ? row.locale : "nl-NL",
    recipient_email: typeof row.recipient_email === "string" ? row.recipient_email : "",
    source: typeof row.source === "string" ? row.source : "website_form",
    status: isInquiryStatus(row.status) ? row.status : "new",
    status_changed_at: typeof row.status_changed_at === "string" ? row.status_changed_at : String(row.created_at),
    last_activity_at: typeof row.last_activity_at === "string" ? row.last_activity_at : String(row.created_at),
    last_replied_at: typeof row.last_replied_at === "string" ? row.last_replied_at : null,
    follow_up_at: typeof row.follow_up_at === "string" ? row.follow_up_at : null,
    closed_at: typeof row.closed_at === "string" ? row.closed_at : null,
    closed_reason: typeof row.closed_reason === "string" ? row.closed_reason : "",
    owner_notes: typeof row.owner_notes === "string" ? row.owner_notes : "",
    created_at: String(row.created_at),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : String(row.created_at),
  }
}

function normalizeMessage(row: Record<string, unknown>): InquiryMessage {
  return {
    id: String(row.id),
    direction: row.direction === "outbound" ? "outbound" : "inbound",
    sender_email: typeof row.sender_email === "string" ? row.sender_email : "",
    sender_name: typeof row.sender_name === "string" ? row.sender_name : "",
    recipient_email: typeof row.recipient_email === "string" ? row.recipient_email : "",
    subject: typeof row.subject === "string" ? row.subject : "",
    body: typeof row.body === "string" ? row.body : "",
    delivery_status: ["received", "queued", "sent", "failed"].includes(String(row.delivery_status))
      ? row.delivery_status as InquiryMessage["delivery_status"]
      : "received",
    error_message: typeof row.error_message === "string" ? row.error_message : null,
    sent_at: typeof row.sent_at === "string" ? row.sent_at : null,
    created_at: String(row.created_at),
  }
}

function normalizeActivity(row: Record<string, unknown>): InquiryActivity {
  return {
    id: String(row.id),
    event_type: row.event_type as InquiryActivity["event_type"],
    body: typeof row.body === "string" ? row.body : "",
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {},
    created_at: String(row.created_at),
  }
}

function normalizeCalendarLink(row: Record<string, unknown>): InquiryCalendarLink {
  return {
    id: String(row.id),
    status: String(row.status),
    entry_type: String(row.entry_type),
    start_at: String(row.start_at),
    end_at: String(row.end_at),
  }
}

async function requireOwnedBusiness(businessId: string, supabase: SupabaseServer) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error("U bent niet ingelogd.")

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .eq("user_id", auth.user.id)
    .maybeSingle()
  if (error) throw error
  if (!business) throw new Error("Dit bedrijf bestaat niet of hoort niet bij uw account.")
  return { userId: auth.user.id, business: { id: business.id, name: business.name || "Uw bedrijf" } }
}

async function getOwnedInquiry(businessId: string, inquiryId: string, supabase: SupabaseServer) {
  await requireOwnedBusiness(businessId, supabase)
  const { data, error } = await supabase
    .from("contact_requests")
    .select("*")
    .eq("id", inquiryId)
    .eq("business_id", businessId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Deze aanvraag bestaat niet of hoort niet bij uw bedrijf.")
  return normalizeRecord(data as Record<string, unknown>)
}

function closedAtForStatus(status: InquiryStatus, now: string) {
  return ["won", "lost", "spam", "archived"].includes(status) ? now : null
}

function safeSearch(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80).replace(/[,%_()]/g, "")
}

export function parseInquiryFilters(searchParams: Record<string, string | string[] | undefined>): Required<InquiryFilters> {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value
  const pageCandidate = Number(first(searchParams.page))
  const statusCandidate = first(searchParams.status)
  const requestTypeCandidate = first(searchParams.type)
  const allowedTypes = ["contact", "quote", "appointment", "booking_request", "whatsapp"]

  return {
    page: Number.isInteger(pageCandidate) && pageCandidate > 0 ? Math.min(pageCandidate, 10_000) : 1,
    pageSize: 25,
    status: statusCandidate === "all" || isInquiryStatus(statusCandidate) ? statusCandidate : "all",
    requestType: requestTypeCandidate === "all" || allowedTypes.includes(requestTypeCandidate ?? "")
      ? requestTypeCandidate as Required<InquiryFilters>["requestType"]
      : "all",
    search: safeSearch(first(searchParams.q)),
    service: safeSearch(first(searchParams.service)),
    source: first(searchParams.source) === "all" ? "all" : safeSearch(first(searchParams.source)),
    dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(first(searchParams.from) ?? "") ? first(searchParams.from)! : "",
    dateTo: /^\d{4}-\d{2}-\d{2}$/.test(first(searchParams.to) ?? "") ? first(searchParams.to)! : "",
    dueOnly: first(searchParams.due) === "1",
  }
}

export async function getInquiryOverview(businessId: string, filters: Required<InquiryFilters>): Promise<InquiryOverview> {
  const supabase = await createClient()
  await requireOwnedBusiness(businessId, supabase)
  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1

  let listQuery = supabase.from("contact_requests").select("*", { count: "exact" }).eq("business_id", businessId).order("last_activity_at", { ascending: false })
  let countQuery = supabase.from("contact_requests").select("status, follow_up_at, closed_at").eq("business_id", businessId).order("last_activity_at", { ascending: false })
  if (filters.status !== "all") {
    listQuery = listQuery.eq("status", filters.status)
    countQuery = countQuery.eq("status", filters.status)
  }
  if (filters.requestType !== "all") {
    listQuery = listQuery.eq("request_type", filters.requestType)
    countQuery = countQuery.eq("request_type", filters.requestType)
  }
  if (filters.dueOnly) {
    const now = new Date().toISOString()
    listQuery = listQuery.not("follow_up_at", "is", null).lte("follow_up_at", now).is("closed_at", null)
    countQuery = countQuery.not("follow_up_at", "is", null).lte("follow_up_at", now).is("closed_at", null)
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`
    const query = `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},service.ilike.${pattern}`
    listQuery = listQuery.or(query)
    countQuery = countQuery.or(query)
  }
  if (filters.service) {
    listQuery = listQuery.eq("service", filters.service)
    countQuery = countQuery.eq("service", filters.service)
  }
  if (filters.source && filters.source !== "all") {
    listQuery = listQuery.eq("source", filters.source)
    countQuery = countQuery.eq("source", filters.source)
  }
  if (filters.dateFrom) {
    listQuery = listQuery.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`)
    countQuery = countQuery.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`)
  }
  if (filters.dateTo) {
    const dateTo = new Date(`${filters.dateTo}T00:00:00.000Z`)
    dateTo.setUTCDate(dateTo.getUTCDate() + 1)
    listQuery = listQuery.lt("created_at", dateTo.toISOString())
    countQuery = countQuery.lt("created_at", dateTo.toISOString())
  }
  const [{ data, error, count }, { data: countRows, error: countError }] = await Promise.all([
    listQuery.range(from, to),
    countQuery,
  ])
  if (error) throw error
  if (countError) throw countError

  const inquiryRows = (data ?? []) as Array<Record<string, unknown>>
  const inquiries = inquiryRows.map((row) => normalizeRecord(row))
  const ids = inquiries.map((item) => item.id)
  const calendarRows = ids.length
    ? await supabase.from("calendar_entries").select("id, contact_request_id, status, entry_type, start_at, end_at").eq("business_id", businessId).in("contact_request_id", ids)
    : { data: [], error: null }
  if (calendarRows.error) throw calendarRows.error
  const calendarItems = (calendarRows.data ?? []) as Array<Record<string, unknown>>
  const calendarByRequest = new Map(
    calendarItems.map((row) => [String(row.contact_request_id), normalizeCalendarLink(row)]),
  )
  const counts = Object.fromEntries(INQUIRY_STATUSES.map((status) => [status, 0])) as Record<InquiryStatus, number>
  let followUpDue = 0
  const countItems = (countRows ?? []) as Array<{ status?: unknown; follow_up_at?: unknown; closed_at?: unknown }>
  for (const row of countItems) {
    const status = isInquiryStatus(row.status) ? row.status : "new"
    counts[status] += 1
    if (row.follow_up_at && !row.closed_at && new Date(String(row.follow_up_at)).getTime() <= Date.now()) followUpDue += 1
  }

  return {
    items: inquiries.map((inquiry) => ({ ...inquiry, calendarEntry: calendarByRequest.get(inquiry.id) ?? null })),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / filters.pageSize)),
    counts,
    followUpDue,
  }
}

export async function getInquiryDetail(businessId: string, inquiryId: string): Promise<InquiryDetail> {
  const supabase = await createClient()
  const inquiry = await getOwnedInquiry(businessId, inquiryId, supabase)
  const [messagesResult, activitiesResult, calendarResult] = await Promise.all([
    supabase.from("contact_request_messages").select("*").eq("contact_request_id", inquiryId).eq("business_id", businessId).order("created_at", { ascending: true }),
    supabase.from("contact_request_activities").select("*").eq("contact_request_id", inquiryId).eq("business_id", businessId).order("created_at", { ascending: true }),
    supabase.from("calendar_entries").select("id, status, entry_type, start_at, end_at").eq("contact_request_id", inquiryId).eq("business_id", businessId).maybeSingle(),
  ])
  if (messagesResult.error) throw messagesResult.error
  if (activitiesResult.error) throw activitiesResult.error
  if (calendarResult.error) throw calendarResult.error
  return {
    inquiry,
    messages: (messagesResult.data ?? []).map((row) => normalizeMessage(row as Record<string, unknown>)),
    activities: (activitiesResult.data ?? []).map((row) => normalizeActivity(row as Record<string, unknown>)),
    calendarEntry: calendarResult.data ? normalizeCalendarLink(calendarResult.data as Record<string, unknown>) : null,
  }
}

export async function getInquiryReplyTemplates(businessId: string): Promise<InquiryReplyTemplate[]> {
  const supabase = await createClient()
  await requireOwnedBusiness(businessId, supabase)
  const { data, error } = await supabase
    .from("contact_request_reply_templates")
    .select("id, name, subject, body")
    .eq("business_id", businessId)
    .order("name", { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: typeof row.name === "string" ? row.name : "",
    subject: typeof row.subject === "string" ? row.subject : "",
    body: typeof row.body === "string" ? row.body : "",
  }))
}

export async function saveInquiryReplyTemplate(input: {
  businessId: string
  name: string
  subject: string
  body: string
}) {
  const supabase = await createClient()
  const { userId } = await requireOwnedBusiness(input.businessId, supabase)
  const name = input.name.trim().slice(0, 80)
  const subject = input.subject.trim().slice(0, 200)
  const body = input.body.trim().slice(0, 8_000)
  if (!name || !subject || !body) throw new Error("Naam, onderwerp en bericht van de template zijn verplicht.")
  const { data, error } = await supabase
    .from("contact_request_reply_templates")
    .upsert({ business_id: input.businessId, name, subject, body }, { onConflict: "business_id,name" })
    .select("id, name, subject, body")
    .single()
  if (error) throw error
  await logAuditEvent({
    userId,
    action: "contact_request.template_saved",
    metadata: { businessId: input.businessId, templateId: data.id },
  })
  return {
    id: String(data.id),
    name: String(data.name),
    subject: String(data.subject),
    body: String(data.body),
  } satisfies InquiryReplyTemplate
}

export async function updateInquiryWorkflow(input: {
  businessId: string
  inquiryId: string
  status?: InquiryStatus
  followUpAt?: string | null
  ownerNotes?: string
  closedReason?: string
}) {
  const supabase = await createClient()
  const { userId } = await requireOwnedBusiness(input.businessId, supabase)
  const current = await getOwnedInquiry(input.businessId, input.inquiryId, supabase)
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = { last_activity_at: now }
  const activities: Array<Record<string, unknown>> = []

  if (input.status && input.status !== current.status) {
    payload.status = input.status
    payload.status_changed_at = now
    payload.closed_at = closedAtForStatus(input.status, now)
    payload.closed_reason = input.closedReason?.trim().slice(0, 500) ?? ""
    activities.push({
      contact_request_id: input.inquiryId,
      business_id: input.businessId,
      actor_user_id: userId,
      event_type: "status_changed",
      body: `Status gewijzigd van ${INQUIRY_STATUS_LABELS[current.status]} naar ${INQUIRY_STATUS_LABELS[input.status]}.`,
      metadata: { from: current.status, to: input.status },
    })
  }

  if (input.followUpAt !== undefined && input.followUpAt !== current.follow_up_at) {
    const followUpAt = input.followUpAt && Number.isFinite(new Date(input.followUpAt).getTime()) ? input.followUpAt : null
    payload.follow_up_at = followUpAt
    activities.push({
      contact_request_id: input.inquiryId,
      business_id: input.businessId,
      actor_user_id: userId,
      event_type: "follow_up_set",
      body: followUpAt ? `Opvolgmoment ingesteld op ${new Date(followUpAt).toLocaleString("nl-NL")}.` : "Opvolgmoment verwijderd.",
      metadata: { follow_up_at: followUpAt },
    })
  }

  if (input.ownerNotes !== undefined) {
    const notes = input.ownerNotes.trim().slice(0, 4_000)
    payload.owner_notes = notes
    if (notes && notes !== current.owner_notes) {
      activities.push({
        contact_request_id: input.inquiryId,
        business_id: input.businessId,
        actor_user_id: userId,
        event_type: "note_added",
        body: "Interne notitie bijgewerkt.",
        metadata: {},
      })
    }
  }

  const { data, error } = await supabase
    .from("contact_requests")
    .update(payload)
    .eq("id", input.inquiryId)
    .eq("business_id", input.businessId)
    .select("*")
    .single()
  if (error) throw error

  if (activities.length) {
    const { error: activityError } = await supabase.from("contact_request_activities").insert(activities)
    if (activityError) throw activityError
  }
  await logAuditEvent({
    userId,
    action: "contact_request.updated",
    metadata: { businessId: input.businessId, inquiryId: input.inquiryId, status: payload.status ?? current.status, followUpAt: payload.follow_up_at ?? current.follow_up_at },
  })
  return normalizeRecord(data as Record<string, unknown>)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

function mailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendInquiryReply(input: {
  businessId: string
  inquiryId: string
  subject: string
  body: string
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { userId, business } = await requireOwnedBusiness(input.businessId, supabase)
  const inquiry = await getOwnedInquiry(input.businessId, input.inquiryId, supabase)
  const subject = input.subject.trim().slice(0, 200)
  const body = input.body.trim().slice(0, 8_000)
  const key = input.idempotencyKey.trim().slice(0, 120)
  if (!subject || !body || !key) throw new Error("Onderwerp, bericht en verzendsleutel zijn verplicht.")
  if (!/^[^\s@]+@[^\s@]+$/.test(inquiry.email)) throw new Error("Deze aanvraag heeft geen geldig e-mailadres.")

  const transporter = mailTransporter()
  if (!transporter) throw new Error("E-mail is nog niet geconfigureerd voor FlexPagina.")

  const { data: existing, error: existingError } = await supabase
    .from("contact_request_messages")
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    if (existing.delivery_status === "sent") return normalizeMessage(existing as Record<string, unknown>)
    throw new Error("Deze reactie wordt al verwerkt of kon niet worden verzonden. Vernieuw de pagina voordat u opnieuw probeert.")
  }

  const fromEmail = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER || PLATFORM_EMAILS.info
  const fromName = `${business.name} via FlexPagina`
  const { data: queued, error: queueError } = await supabase
    .from("contact_request_messages")
    .insert({
      contact_request_id: inquiry.id,
      business_id: input.businessId,
      direction: "outbound",
      sender_email: fromEmail,
      sender_name: fromName,
      recipient_email: inquiry.email,
      subject,
      body,
      delivery_status: "queued",
      idempotency_key: key,
    })
    .select("*")
    .single()
  if (queueError) throw queueError

  let providerMessageId: string | null = null
  try {
    const result = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: inquiry.email,
      replyTo: inquiry.recipient_email || fromEmail,
      subject,
      text: body,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;line-height:1.6">${escapeHtml(body)}</div>`,
    })
    providerMessageId = result.messageId || null
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Onbekende afleverfout"
    await supabase.from("contact_request_messages").update({ delivery_status: "failed", error_message: message }).eq("id", queued.id).eq("business_id", input.businessId)
    throw new Error("De e-mail kon niet worden verzonden. De fout is opgeslagen bij deze aanvraag.")
  }

  const now = new Date().toISOString()
  const { data: sent, error: sentError } = await supabase
    .from("contact_request_messages")
    .update({ delivery_status: "sent", provider_message_id: providerMessageId, sent_at: now, error_message: null })
    .eq("id", queued.id)
    .eq("business_id", input.businessId)
    .select("*")
    .single()
  if (sentError) {
    throw new Error("De e-mail is waarschijnlijk verzonden, maar de berichtgeschiedenis kon niet worden bijgewerkt. Probeer niet opnieuw te versturen.")
  }
  const { error: requestError } = await supabase
    .from("contact_requests")
    .update({ status: "awaiting_customer", status_changed_at: now, last_activity_at: now, last_replied_at: now, closed_at: null, closed_reason: "" })
    .eq("id", inquiry.id)
    .eq("business_id", input.businessId)
  if (requestError) throw new Error("De e-mail is verzonden, maar de aanvraag kon niet worden bijgewerkt.")
  const { error: activityError } = await supabase.from("contact_request_activities").insert({
    contact_request_id: inquiry.id,
    business_id: input.businessId,
    actor_user_id: userId,
    event_type: "reply_sent",
    body: "Reactie per e-mail verzonden.",
    metadata: { message_id: sent.id },
  })
  if (activityError) throw new Error("De e-mail is verzonden, maar de activiteitenhistorie kon niet worden bijgewerkt.")
  await logAuditEvent({
    userId,
    action: "contact_request.reply_sent",
    metadata: { businessId: input.businessId, inquiryId: inquiry.id, messageId: sent.id },
  })
  return normalizeMessage(sent as Record<string, unknown>)
}
