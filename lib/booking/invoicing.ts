import "server-only"

import { createHash, randomUUID } from "node:crypto"
import nodemailer from "nodemailer"

import { createInvoicePdf, type InvoicePdfSnapshot } from "@/lib/booking/invoice-pdf"
import {
  calculateBookingFinancials,
  parseServicePriceMinor,
  validateInvoiceParties,
  type BookingFinancialLine,
  type InvoiceParty,
} from "@/lib/booking/pricing"
import { localDateForInstant } from "@/lib/booking/availability"
import { PLATFORM_EMAILS } from "@/lib/platform"
import { assertCurrentUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type SettlementStatus = "open" | "paid" | "refunded"
export type InvoiceStatus = "draft" | "issued" | "credited" | "void"

export interface ReservationFinancial {
  calendar_entry_id: string
  business_id: string
  reservation_number: string
  currency: string
  pricing_status: "needs_review" | "ready"
  settlement_status: SettlementStatus
  line_items: BookingFinancialLine[]
  subtotal_minor: number
  vat_total_minor: number
  total_minor: number
  priced_at: string | null
}

export interface BookingInvoiceProfile {
  business_id: string
  legal_name: string
  address_line1: string
  address_line2: string
  postal_code: string
  city: string
  country_code: string
  email: string
  vat_id: string
  kvk_number: string
  iban: string
  default_vat_basis_points: number
  invoice_prefix: string
  credit_note_prefix: string
  payment_term_days: number
  accent_color: string
}

export interface BookingInvoice {
  id: string
  business_id: string
  calendar_entry_id: string
  document_type: "invoice" | "credit_note"
  status: InvoiceStatus
  invoice_number: string | null
  reservation_number: string
  currency: string
  seller_details: InvoiceParty
  customer_details: InvoiceParty
  line_items: BookingFinancialLine[]
  subtotal_minor: number
  vat_total_minor: number
  total_minor: number
  service_date: string
  due_date: string
  issued_at: string | null
  corrects_invoice_id: string | null
  pdf_storage_path: string | null
  pdf_sha256: string | null
  first_downloaded_at: string | null
  emailed_at: string | null
  voided_at: string | null
  void_reason: string
  created_at: string
}

export interface BookingFinanceData {
  financials: ReservationFinancial[]
  invoices: BookingInvoice[]
  profile: BookingInvoiceProfile
}

type OwnedBooking = {
  id: string
  business_id: string
  service_id: string | null
  contact_request_id: string | null
  customer_name: string
  customer_email: string
  start_at: string
  end_at: string
  timezone: string
  status: string
  metadata: Record<string, unknown>
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>
type InvoiceLogo = NonNullable<InvoicePdfSnapshot["logo"]>

function logoUrlFromSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return ""
  const snapshot = value as { sections?: unknown }
  if (!Array.isArray(snapshot.sections)) return ""
  for (const section of snapshot.sections) {
    if (!section || typeof section !== "object") continue
    const candidate = section as { type?: unknown; styles?: { logo?: unknown } }
    if (candidate.type === "nav" && typeof candidate.styles?.logo === "string") {
      return candidate.styles.logo.trim().slice(0, 4096)
    }
  }
  return ""
}

async function resolveCompanyLogoUrl(admin: AdminClient, entry: Pick<OwnedBooking, "business_id" | "contact_request_id">) {
  let websiteId = ""
  if (entry.contact_request_id) {
    const { data: request } = await admin.from("contact_requests").select("website_id").eq("id", entry.contact_request_id).maybeSingle()
    websiteId = request?.website_id || ""
  }

  const websiteQuery = admin.from("websites").select("id, live_snapshot").eq("business_id", entry.business_id)
  const { data: website } = websiteId
    ? await websiteQuery.eq("id", websiteId).maybeSingle()
    : await websiteQuery.eq("published", true).order("live_published_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
  if (!website) return ""

  const publishedLogo = logoUrlFromSnapshot(website.live_snapshot)
  if (publishedLogo) return publishedLogo
  const { data: navigation } = await admin.from("website_sections").select("styles")
    .eq("website_id", website.id).eq("type", "nav").order("position", { ascending: true }).limit(1).maybeSingle()
  const styles = navigation?.styles && typeof navigation.styles === "object" ? navigation.styles as { logo?: unknown } : null
  return typeof styles?.logo === "string" ? styles.logo.trim().slice(0, 4096) : ""
}

function detectInvoiceLogo(bytes: Uint8Array): InvoiceLogo | null {
  if (bytes.length < 4 || bytes.length > 2 * 1024 * 1024) return null
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const width = view.getUint32(16)
    const height = view.getUint32(20)
    if (width > 0 && height > 0 && width <= 4096 && height <= 4096 && width * height <= 16_000_000) return { bytes, format: "png" }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2
    const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue }
      const marker = bytes[offset + 1]
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
      if (startOfFrameMarkers.has(marker)) {
        const height = (bytes[offset + 5] << 8) | bytes[offset + 6]
        const width = (bytes[offset + 7] << 8) | bytes[offset + 8]
        if (width > 0 && height > 0 && width <= 4096 && height <= 4096 && width * height <= 16_000_000) return { bytes, format: "jpeg" }
        return null
      }
      if (segmentLength < 2) return null
      offset += segmentLength + 2
    }
  }
  return null
}

async function loadInvoiceLogo(admin: AdminClient, value: string | undefined): Promise<InvoiceLogo | null> {
  const logoUrl = value?.trim() || ""
  if (!logoUrl) return null
  const embedded = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/i.exec(logoUrl)
  if (embedded) return detectInvoiceLogo(new Uint8Array(Buffer.from(embedded[2], "base64")))

  let url: URL
  try {
    url = new URL(logoUrl)
  } catch {
    return null
  }
  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (configuredSupabaseUrl) {
    try {
      if (url.origin !== new URL(configuredSupabaseUrl).origin) return null
    } catch {
      return null
    }
  }
  const marker = "/storage/v1/object/public/user-images/"
  const markerIndex = url.pathname.indexOf(marker)
  if (markerIndex < 0) return null
  const storagePath = url.pathname.slice(markerIndex + marker.length).split("/").map((part) => decodeURIComponent(part)).join("/")
  if (!storagePath || storagePath.split("/").some((part) => !part || part === "." || part === "..")) return null
  const { data, error } = await admin.storage.from("user-images").download(storagePath)
  if (error || !data || data.size > 2 * 1024 * 1024) return null
  return detectInvoiceLogo(new Uint8Array(await data.arrayBuffer()))
}

function parseFinancial(row: Record<string, unknown>): ReservationFinancial {
  return {
    calendar_entry_id: String(row.calendar_entry_id),
    business_id: String(row.business_id),
    reservation_number: String(row.reservation_number),
    currency: String(row.currency || "EUR"),
    pricing_status: row.pricing_status === "ready" ? "ready" : "needs_review",
    settlement_status: (["paid", "refunded"] as unknown[]).includes(row.settlement_status) ? row.settlement_status as SettlementStatus : "open",
    line_items: Array.isArray(row.line_items) ? row.line_items as BookingFinancialLine[] : [],
    subtotal_minor: numberValue(row.subtotal_minor),
    vat_total_minor: numberValue(row.vat_total_minor),
    total_minor: numberValue(row.total_minor),
    priced_at: typeof row.priced_at === "string" ? row.priced_at : null,
  }
}

function parseInvoice(row: Record<string, unknown>): BookingInvoice {
  return {
    id: String(row.id), business_id: String(row.business_id), calendar_entry_id: String(row.calendar_entry_id),
    document_type: row.document_type === "credit_note" ? "credit_note" : "invoice",
    status: (["issued", "credited", "void"] as unknown[]).includes(row.status) ? row.status as InvoiceStatus : "draft",
    invoice_number: typeof row.invoice_number === "string" ? row.invoice_number : null,
    reservation_number: String(row.reservation_number), currency: String(row.currency || "EUR"),
    seller_details: (row.seller_details || {}) as InvoiceParty,
    customer_details: (row.customer_details || {}) as InvoiceParty,
    line_items: Array.isArray(row.line_items) ? row.line_items as BookingFinancialLine[] : [],
    subtotal_minor: numberValue(row.subtotal_minor), vat_total_minor: numberValue(row.vat_total_minor), total_minor: numberValue(row.total_minor),
    service_date: String(row.service_date), due_date: String(row.due_date),
    issued_at: typeof row.issued_at === "string" ? row.issued_at : null,
    corrects_invoice_id: typeof row.corrects_invoice_id === "string" ? row.corrects_invoice_id : null,
    pdf_storage_path: typeof row.pdf_storage_path === "string" ? row.pdf_storage_path : null,
    pdf_sha256: typeof row.pdf_sha256 === "string" ? row.pdf_sha256 : null,
    first_downloaded_at: typeof row.first_downloaded_at === "string" ? row.first_downloaded_at : null,
    emailed_at: typeof row.emailed_at === "string" ? row.emailed_at : null,
    voided_at: typeof row.voided_at === "string" ? row.voided_at : null,
    void_reason: String(row.void_reason || ""), created_at: String(row.created_at),
  }
}

function defaultProfile(business: Record<string, unknown>): BookingInvoiceProfile {
  return {
    business_id: String(business.id), legal_name: String(business.name || ""),
    address_line1: String(business.street || ""), address_line2: "",
    postal_code: String(business.postal || ""), city: String(business.city || ""),
    country_code: String(business.country || "NL").slice(0, 2).toUpperCase(),
    email: String(business.email || ""), vat_id: "", kvk_number: "", iban: "",
    default_vat_basis_points: 2100, invoice_prefix: "F", credit_note_prefix: "CR",
    payment_term_days: 14, accent_color: "#16302B",
  }
}

async function ownerContext() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Niet ingelogd.")
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  return { supabase, user }
}

async function ownedBusiness(businessId: string) {
  const { supabase, user } = await ownerContext()
  const { data, error } = await supabase.from("businesses").select("*").eq("id", businessId).eq("user_id", user.id).maybeSingle()
  if (error || !data) throw new Error("Bedrijf niet gevonden.")
  return { supabase, user, business: data as Record<string, unknown> }
}

async function ownedBooking(entryId: string) {
  const { supabase, user } = await ownerContext()
  const { data, error } = await supabase.from("calendar_entries").select("*").eq("id", entryId).maybeSingle()
  if (error || !data) throw new Error("Boeking niet gevonden.")
  const entry = data as OwnedBooking
  if (entry.metadata?.source !== "booking_engine") throw new Error("Facturen zijn alleen beschikbaar voor online boekingen.")
  return { supabase, user, entry }
}

async function ownedInvoice(invoiceId: string) {
  const { supabase, user } = await ownerContext()
  const { data, error } = await supabase.from("booking_invoices").select("*").eq("id", invoiceId).maybeSingle()
  if (error || !data) throw new Error("Factuur niet gevonden.")
  return { supabase, user, invoice: parseInvoice(data as Record<string, unknown>) }
}

export async function getBookingFinanceData(businessId: string): Promise<BookingFinanceData> {
  const { supabase, business } = await ownedBusiness(businessId)
  const [financials, invoices, profile] = await Promise.all([
    supabase.from("booking_reservation_financials").select("*").eq("business_id", businessId),
    supabase.from("booking_invoices").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("booking_invoice_profiles").select("*").eq("business_id", businessId).maybeSingle(),
  ])
  if (financials.error || invoices.error || profile.error) throw financials.error || invoices.error || profile.error
  return {
    financials: (financials.data ?? []).map((row) => parseFinancial(row as Record<string, unknown>)),
    invoices: (invoices.data ?? []).map((row) => parseInvoice(row as Record<string, unknown>)),
    profile: profile.data ? { ...defaultProfile(business), ...profile.data } as BookingInvoiceProfile : defaultProfile(business),
  }
}

export async function saveReservationPricing(entryId: string, lines: Array<Partial<BookingFinancialLine>>) {
  const { entry } = await ownedBooking(entryId)
  if (entry.status !== "confirmed") throw new Error("Bevestig de reservering voordat u een prijs vastlegt.")
  const totals = calculateBookingFinancials(lines)
  const admin = await createAdminClient()
  const { data, error } = await admin.from("booking_reservation_financials").update({
    currency: "EUR", pricing_status: "ready", line_items: totals.lines,
    subtotal_minor: totals.subtotalMinor, vat_total_minor: totals.vatTotalMinor,
    total_minor: totals.totalMinor, priced_at: new Date().toISOString(),
  }).eq("calendar_entry_id", entry.id).eq("business_id", entry.business_id).select("*").maybeSingle()
  if (error || !data) throw new Error("De reserveringsprijs kon niet worden opgeslagen.")
  return parseFinancial(data as Record<string, unknown>)
}

export async function setReservationSettlementStatus(entryId: string, status: SettlementStatus) {
  const { entry } = await ownedBooking(entryId)
  if (!["open", "paid", "refunded"].includes(status)) throw new Error("Ongeldige betaalstatus.")
  const admin = await createAdminClient()
  const { data, error } = await admin.from("booking_reservation_financials").update({ settlement_status: status })
    .eq("calendar_entry_id", entry.id).eq("business_id", entry.business_id).select("*").maybeSingle()
  if (error || !data) throw new Error("De betaalstatus kon niet worden opgeslagen.")
  return parseFinancial(data as Record<string, unknown>)
}

async function initialLineItems(entry: OwnedBooking) {
  const admin = await createAdminClient()
  const { data: financial } = await admin.from("booking_reservation_financials").select("*").eq("calendar_entry_id", entry.id).maybeSingle()
  if (financial?.pricing_status === "ready" && Array.isArray(financial.line_items) && financial.line_items.length) {
    return { financial: parseFinancial(financial as Record<string, unknown>), lines: financial.line_items as BookingFinancialLine[] }
  }
  const { data: service } = entry.service_id
    ? await admin.from("services").select("title, price").eq("id", entry.service_id).maybeSingle()
    : { data: null }
  const totals = calculateBookingFinancials([{
    id: randomUUID(), description: service?.title || "Reservering", quantity_milli: 1000,
    unit_price_minor: parseServicePriceMinor(service?.price || ""), discount_minor: 0, vat_rate_basis_points: 0,
  }])
  if (!financial) throw new Error("Reserveringsnummer ontbreekt. Pas eerst de Phase 5-migratie toe.")
  return { financial: parseFinancial(financial as Record<string, unknown>), lines: totals.lines }
}

export async function createBookingInvoiceDraft(entryId: string) {
  const { user, entry } = await ownedBooking(entryId)
  if (entry.status !== "confirmed" && entry.status !== "completed") throw new Error("Alleen een bevestigde reservering kan worden gefactureerd.")
  const admin = await createAdminClient()
  const { data: existing } = await admin.from("booking_invoices").select("*").eq("calendar_entry_id", entry.id)
    .eq("document_type", "invoice").eq("status", "draft").maybeSingle()
  if (existing) return parseInvoice(existing as Record<string, unknown>)
  const [{ data: business }, { data: profile }, initial, logoUrl] = await Promise.all([
    admin.from("businesses").select("*").eq("id", entry.business_id).single(),
    admin.from("booking_invoice_profiles").select("*").eq("business_id", entry.business_id).maybeSingle(),
    initialLineItems(entry),
    resolveCompanyLogoUrl(admin, entry),
  ])
  const selectedProfile = profile ? { ...defaultProfile(business), ...profile } as BookingInvoiceProfile : defaultProfile(business)
  const totals = calculateBookingFinancials(initial.lines)
  const serviceDate = localDateForInstant(new Date(entry.start_at), entry.timezone || "Europe/Amsterdam")
  const dueDate = new Date()
  dueDate.setUTCDate(dueDate.getUTCDate() + selectedProfile.payment_term_days)
  const { data, error } = await admin.from("booking_invoices").insert({
    business_id: entry.business_id, calendar_entry_id: entry.id, document_type: "invoice", status: "draft",
    reservation_number: initial.financial.reservation_number, currency: "EUR",
    seller_details: {
      legal_name: selectedProfile.legal_name, address_line1: selectedProfile.address_line1,
      address_line2: selectedProfile.address_line2, postal_code: selectedProfile.postal_code,
      city: selectedProfile.city, country_code: selectedProfile.country_code, email: selectedProfile.email,
      vat_id: selectedProfile.vat_id, kvk_number: selectedProfile.kvk_number, iban: selectedProfile.iban,
      logo_url: logoUrl || undefined,
    },
    customer_details: { name: entry.customer_name, email: entry.customer_email, address_line1: "", address_line2: "", postal_code: "", city: "", country_code: "NL" },
    line_items: totals.lines, subtotal_minor: totals.subtotalMinor, vat_total_minor: totals.vatTotalMinor,
    total_minor: totals.totalMinor, service_date: serviceDate, due_date: dueDate.toISOString().slice(0, 10), created_by: user.id,
  }).select("*").single()
  if (error || !data) throw new Error(error?.code === "23505" ? "Er bestaat al een conceptfactuur." : "Conceptfactuur kon niet worden gemaakt.")
  return parseInvoice(data as Record<string, unknown>)
}

export async function saveBookingInvoiceDraft(invoiceId: string, input: {
  seller: InvoiceParty
  customer: InvoiceParty
  lines: Array<Partial<BookingFinancialLine>>
  serviceDate: string
  dueDate: string
  profile: Partial<BookingInvoiceProfile>
}) {
  const { invoice } = await ownedInvoice(invoiceId)
  if (invoice.status !== "draft" || invoice.document_type !== "invoice") throw new Error("Alleen een gewone conceptfactuur kan worden bewerkt.")
  const totals = calculateBookingFinancials(input.lines)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error("Controleer de lever- en vervaldatum.")
  const admin = await createAdminClient()
  const { data, error } = await admin.from("booking_invoices").update({
    seller_details: input.seller, customer_details: input.customer, line_items: totals.lines,
    subtotal_minor: totals.subtotalMinor, vat_total_minor: totals.vatTotalMinor, total_minor: totals.totalMinor,
    service_date: input.serviceDate, due_date: input.dueDate,
  }).eq("id", invoice.id).eq("status", "draft").select("*").maybeSingle()
  if (error || !data) throw new Error("Conceptfactuur kon niet worden opgeslagen.")
  const profile = {
    business_id: invoice.business_id,
    legal_name: input.seller.legal_name?.trim() || "", address_line1: input.seller.address_line1?.trim() || "",
    address_line2: input.seller.address_line2?.trim() || "", postal_code: input.seller.postal_code?.trim() || "",
    city: input.seller.city?.trim() || "", country_code: (input.seller.country_code || "NL").toUpperCase().slice(0, 2),
    email: input.seller.email?.trim() || "", vat_id: input.seller.vat_id?.trim() || "", kvk_number: input.seller.kvk_number?.trim() || "",
    iban: input.seller.iban?.trim() || "", default_vat_basis_points: Number(input.profile.default_vat_basis_points ?? 2100),
    invoice_prefix: String(input.profile.invoice_prefix || "F").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "F",
    credit_note_prefix: String(input.profile.credit_note_prefix || "CR").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "CR",
    payment_term_days: Math.max(0, Math.min(365, Number(input.profile.payment_term_days ?? 14))),
    accent_color: /^#[0-9A-Fa-f]{6}$/.test(String(input.profile.accent_color)) ? input.profile.accent_color : "#16302B",
  }
  const { error: profileError } = await admin.from("booking_invoice_profiles").upsert(profile, { onConflict: "business_id" })
  if (profileError) throw new Error("Factuurprofiel kon niet worden opgeslagen.")
  return parseInvoice(data as Record<string, unknown>)
}

function invoicePdfSnapshot(invoice: BookingInvoice, profile: BookingInvoiceProfile, correctsInvoiceNumber?: string | null, logo?: InvoiceLogo | null): InvoicePdfSnapshot {
  if (!invoice.invoice_number || !invoice.issued_at) throw new Error("De factuur is nog niet uitgegeven.")
  return {
    documentType: invoice.document_type, invoiceNumber: invoice.invoice_number,
    reservationNumber: invoice.reservation_number, currency: invoice.currency,
    seller: invoice.seller_details, customer: invoice.customer_details, lines: invoice.line_items,
    subtotalMinor: invoice.subtotal_minor, vatTotalMinor: invoice.vat_total_minor, totalMinor: invoice.total_minor,
    serviceDate: invoice.service_date, dueDate: invoice.due_date, issuedAt: invoice.issued_at,
    correctsInvoiceNumber, accentColor: profile.accent_color, logo,
  }
}

export async function ensureIssuedInvoicePdf(invoiceId: string) {
  const admin = await createAdminClient()
  const { data: row, error } = await admin.from("booking_invoices").select("*").eq("id", invoiceId).maybeSingle()
  if (error || !row) throw new Error("Factuur niet gevonden.")
  let invoice = parseInvoice(row as Record<string, unknown>)
  if (!invoice.invoice_number || !invoice.issued_at || invoice.status === "draft") throw new Error("Factuur is nog niet uitgegeven.")
  if (invoice.pdf_storage_path) {
    const { data, error: downloadError } = await admin.storage.from("booking-invoices").download(invoice.pdf_storage_path)
    if (!downloadError && data) return { invoice, bytes: new Uint8Array(await data.arrayBuffer()) }
  }
  const [{ data: profileRow }, { data: corrected }] = await Promise.all([
    admin.from("booking_invoice_profiles").select("*").eq("business_id", invoice.business_id).maybeSingle(),
    invoice.corrects_invoice_id
      ? admin.from("booking_invoices").select("invoice_number").eq("id", invoice.corrects_invoice_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const { data: business } = await admin.from("businesses").select("*").eq("id", invoice.business_id).single()
  const profile = profileRow ? { ...defaultProfile(business), ...profileRow } as BookingInvoiceProfile : defaultProfile(business)
  let logoUrl = invoice.seller_details.logo_url
  if (!logoUrl) {
    const { data: entry } = await admin.from("calendar_entries").select("business_id, contact_request_id").eq("id", invoice.calendar_entry_id).maybeSingle()
    if (entry) logoUrl = await resolveCompanyLogoUrl(admin, entry as Pick<OwnedBooking, "business_id" | "contact_request_id">)
  }
  const logo = await loadInvoiceLogo(admin, logoUrl)
  const bytes = await createInvoicePdf(invoicePdfSnapshot(invoice, profile, corrected?.invoice_number || null, logo))
  const hash = createHash("sha256").update(bytes).digest("hex")
  const safeNumber = invoice.invoice_number.replace(/[^A-Za-z0-9-]/g, "_")
  const path = `${invoice.business_id}/${invoice.id}/${safeNumber}.pdf`
  const { error: uploadError } = await admin.storage.from("booking-invoices").upload(path, bytes, { contentType: "application/pdf", cacheControl: "31536000", upsert: false })
  if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) throw new Error("Factuur-PDF kon niet worden opgeslagen.")
  const { data: updated, error: updateError } = await admin.from("booking_invoices").update({
    pdf_storage_path: path, pdf_sha256: hash, pdf_size_bytes: bytes.length,
  }).eq("id", invoice.id).is("pdf_storage_path", null).select("*").maybeSingle()
  if (updateError) throw new Error("Factuur-PDF kon niet worden gekoppeld.")
  if (updated) invoice = parseInvoice(updated as Record<string, unknown>)
  return { invoice, bytes }
}

export async function issueBookingInvoice(invoiceId: string) {
  const { invoice } = await ownedInvoice(invoiceId)
  if (invoice.status !== "draft") throw new Error("Deze factuur is al uitgegeven.")
  if (invoice.due_date < new Date().toISOString().slice(0, 10)) throw new Error("De vervaldatum mag niet voor de factuurdatum liggen.")
  validateInvoiceParties(invoice.seller_details, invoice.customer_details)
  const totals = calculateBookingFinancials(invoice.line_items)
  if (totals.subtotalMinor !== invoice.subtotal_minor || totals.vatTotalMinor !== invoice.vat_total_minor || totals.totalMinor !== invoice.total_minor) throw new Error("Factuurtotalen komen niet overeen met de regels.")
  const admin = await createAdminClient()
  const { error } = await admin.rpc("issue_booking_invoice", { p_invoice_id: invoice.id })
  if (error) throw new Error(error.message.includes("incomplete") ? "Factuurgegevens zijn nog niet compleet." : "Factuur kon niet worden uitgegeven.")
  return (await ensureIssuedInvoicePdf(invoice.id)).invoice
}

export async function voidUndeliveredInvoice(invoiceId: string, reason: string) {
  const { invoice } = await ownedInvoice(invoiceId)
  if (invoice.status !== "issued" || invoice.document_type !== "invoice") throw new Error("Alleen een uitgegeven factuur kan ongeldig worden gemaakt.")
  if (invoice.emailed_at || invoice.first_downloaded_at) throw new Error("Deze factuur is al geleverd. Maak een creditfactuur in plaats van de waarden te wijzigen.")
  if (reason.trim().length < 5) throw new Error("Leg kort vast waarom deze factuur ongeldig wordt gemaakt.")
  const admin = await createAdminClient()
  const { data, error } = await admin.from("booking_invoices").update({ status: "void", voided_at: new Date().toISOString(), void_reason: reason.trim().slice(0, 1000) })
    .eq("id", invoice.id).eq("status", "issued").select("*").maybeSingle()
  if (error || !data) throw new Error("Factuur kon niet ongeldig worden gemaakt.")
  return parseInvoice(data as Record<string, unknown>)
}

export async function createFullCreditNote(invoiceId: string) {
  const { user, invoice } = await ownedInvoice(invoiceId)
  if (invoice.status !== "issued" || invoice.document_type !== "invoice") throw new Error("Voor deze factuur kan geen creditfactuur worden gemaakt.")
  const admin = await createAdminClient()
  const { data: existing } = await admin.from("booking_invoices").select("*").eq("corrects_invoice_id", invoice.id).maybeSingle()
  if (existing) throw new Error("Voor deze factuur bestaat al een creditfactuur.")
  const { data: created, error } = await admin.from("booking_invoices").insert({
    business_id: invoice.business_id, calendar_entry_id: invoice.calendar_entry_id,
    document_type: "credit_note", status: "draft", reservation_number: invoice.reservation_number,
    currency: invoice.currency, seller_details: invoice.seller_details, customer_details: invoice.customer_details,
    line_items: invoice.line_items, subtotal_minor: invoice.subtotal_minor, vat_total_minor: invoice.vat_total_minor,
    total_minor: invoice.total_minor, service_date: invoice.service_date, due_date: invoice.due_date,
    corrects_invoice_id: invoice.id, created_by: user.id,
  }).select("id").single()
  if (error || !created) throw new Error("Creditfactuur kon niet worden gemaakt.")
  const { error: issueError } = await admin.rpc("issue_booking_invoice", { p_invoice_id: created.id })
  if (issueError) throw new Error("Creditfactuur kon niet worden uitgegeven.")
  return (await ensureIssuedInvoicePdf(created.id)).invoice
}

export async function markInvoiceDownloaded(invoiceId: string) {
  const admin = await createAdminClient()
  await admin.from("booking_invoices").update({ first_downloaded_at: new Date().toISOString() }).eq("id", invoiceId).is("first_downloaded_at", null)
}

export async function emailIssuedInvoice(invoiceId: string) {
  const { invoice } = await ownedInvoice(invoiceId)
  if (!["issued", "credited"].includes(invoice.status)) throw new Error("Alleen een uitgegeven factuur kan worden verzonden.")
  const recipient = invoice.customer_details.email?.trim() || ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Vul eerst een geldig e-mailadres van de klant in.")
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const password = process.env.SMTP_PASS
  if (!host || !user || !password) throw new Error("SMTP is niet ingesteld.")
  const admin = await createAdminClient()
  const idempotencyKey = `invoice:${invoice.id}:${randomUUID()}`
  const { data: delivery, error: deliveryError } = await admin.from("booking_invoice_emails").insert({
    invoice_id: invoice.id, business_id: invoice.business_id, recipient_email: recipient, idempotency_key: idempotencyKey,
  }).select("*").single()
  if (deliveryError?.code === "23505") throw new Error("Deze factuur wordt al verzonden.")
  if (deliveryError || !delivery) throw new Error("Factuurverzending kon niet worden gestart.")
  await admin.from("booking_invoice_emails").update({ status: "sending", attempts: 1 }).eq("id", delivery.id).eq("status", "pending")
  const { bytes, invoice: storedInvoice } = await ensureIssuedInvoicePdf(invoice.id)
  const messageId = `<invoice-${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 28)}@${(process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "flexpagina.nl").toLowerCase()}>`
  const transporter = nodemailer.createTransport({
    host, port: Number(process.env.SMTP_PORT) || 465, secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass: password }, connectionTimeout: 15_000, socketTimeout: 30_000,
  })
  try {
    const label = storedInvoice.document_type === "credit_note" ? "creditfactuur" : "factuur"
    const info = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME?.trim() || "FlexPagina boekingen"} <${process.env.SMTP_FROM?.trim() || user || PLATFORM_EMAILS.info}>`,
      to: recipient,
      subject: `${label[0].toUpperCase()}${label.slice(1)} ${storedInvoice.invoice_number}`,
      text: `Beste ${storedInvoice.customer_details.name || "klant"},\n\nIn de bijlage vindt u ${label} ${storedInvoice.invoice_number} voor reservering ${storedInvoice.reservation_number}.\n\nDeze e-mail is handmatig door de ondernemer verzonden.`,
      html: `<p>Beste ${escapeHtml(storedInvoice.customer_details.name || "klant")},</p><p>In de bijlage vindt u ${label} <strong>${escapeHtml(storedInvoice.invoice_number)}</strong> voor reservering <strong>${escapeHtml(storedInvoice.reservation_number)}</strong>.</p><p>Deze e-mail is handmatig door de ondernemer verzonden.</p>`,
      attachments: [{ filename: `${storedInvoice.invoice_number}.pdf`, content: Buffer.from(bytes), contentType: "application/pdf" }],
      messageId,
      headers: { "X-FlexPagina-Invoice-Delivery": delivery.id },
    })
    const sentAt = new Date().toISOString()
    await Promise.all([
      admin.from("booking_invoice_emails").update({ status: "sent", message_id: info.messageId || messageId, sent_at: sentAt, last_error: null }).eq("id", delivery.id),
      admin.from("booking_invoices").update({ emailed_at: sentAt, email_message_id: info.messageId || messageId }).eq("id", invoice.id),
    ])
    return { invoiceId: invoice.id, recipient }
  } catch (error) {
    await admin.from("booking_invoice_emails").update({ status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "SMTP-verzending mislukt." }).eq("id", delivery.id)
    throw new Error("De factuur kon niet per e-mail worden verzonden.")
  } finally {
    transporter.close()
  }
}
