import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createAdminClient } from "@/lib/supabase/admin"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { PLATFORM_EMAILS } from "@/lib/platform"

const FROM_EMAIL = process.env.SMTP_FROM?.trim() || PLATFORM_EMAILS.info
const FROM_NAME = process.env.SMTP_FROM_NAME?.trim() || "Website aanvraag"

type RequestType = "contact" | "quote" | "appointment" | "booking_request" | "whatsapp"

const REQUEST_LABELS: Record<RequestType, string> = {
  contact: "Contactbericht",
  quote: "Offerteaanvraag",
  appointment: "Afspraakaanvraag",
  booking_request: "Boekingsaanvraag",
  whatsapp: "WhatsApp aanvraag",
}

const FIELD_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  service: 160,
  serviceId: 80,
  date: 80,
  preferredDate: 80,
  budget: 80,
  message: 3000,
  websiteId: 80,
  businessId: 80,
  recipientEmail: 254,
  source: 80,
}

const GENERIC_ERROR = "Aanvraag kon niet worden verzonden. Controleer de velden en probeer het opnieuw."
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_PATTERN = /https?:\/\/|www\.|\.ru\b|\.cn\b|\.zip\b/gi
const SPAM_TERMS = [
  "casino",
  "crypto",
  "forex",
  "loan",
  "viagra",
  "porn",
  "seo backlinks",
  "guest post",
]

function normalizeRequestType(value: unknown): RequestType {
  if (value === "quote" || value === "appointment" || value === "booking_request" || value === "whatsapp") {
    return value
  }
  return "contact"
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function limitString(value: unknown, maxLength: number) {
  return getString(value).slice(0, maxLength)
}

function getTooLongFields(body: Record<string, unknown>) {
  return Object.entries(FIELD_LIMITS)
    .filter(([field, maxLength]) => getString(body[field]).length > maxLength)
    .map(([field]) => field)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function hasHoneypotValue(body: Record<string, unknown>) {
  return ["company", "website", "url", "hp_field", "confirmEmail"].some((field) => getString(body[field]).length > 0)
}

function looksLikeSpam(input: {
  name: string
  email: string
  phone: string
  service: string
  budget: string
  message: string
}) {
  const combined = `${input.name} ${input.email} ${input.phone} ${input.service} ${input.budget} ${input.message}`.toLowerCase()
  const linkCount = combined.match(URL_PATTERN)?.length ?? 0
  const spamTermHit = SPAM_TERMS.some((term) => combined.includes(term))

  return linkCount > 3 || spamTermHit
}

function logRejectedRequest(reason: string, request: NextRequest, metadata: Record<string, unknown> = {}) {
  console.warn("[requests] Rejected public request", {
    reason,
    ip: getRateLimitKey(request, "contact_form").replace("contact_form:", ""),
    userAgent: request.headers.get("user-agent"),
    ...metadata,
  })
}

function parsePreferredDate(value: string) {
  if (!value) return null

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = isDateOnly ? new Date(`${value}T00:00:00`) : new Date(value)

  if (!Number.isFinite(date.getTime())) return null

  const end = new Date(date)
  if (isDateOnly) {
    end.setDate(end.getDate() + 1)
  } else {
    end.setHours(end.getHours() + 1)
  }

  return {
    start_at: date.toISOString(),
    end_at: end.toISOString(),
    all_day: isDateOnly,
  }
}

function getCalendarEntryType(requestType: RequestType) {
  return requestType === "booking_request" ? "booking" : "appointment"
}

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

async function resolveRequestContext(input: {
  websiteId?: string
  businessId?: string
  recipientEmail?: string
}) {
  const supabase = await createAdminClient()
  const websiteId = input.websiteId || null
  let businessId = input.businessId || null
  let userId: string | null = null
  let businessEmail = ""
  let userEmail = ""
  let businessName = "uw website"
  let acceptsPublicRequests = false
  let liveServiceIds: string[] = []

  if (websiteId) {
    const { data: website } = await supabase
      .from("websites")
      .select("id, user_id, business_id, title, published, live_snapshot")
      .eq("id", websiteId)
      .maybeSingle()

    if (website) {
      const snapshot = website.published && isWebsiteLiveSnapshot(website.live_snapshot)
        ? website.live_snapshot
        : null
      acceptsPublicRequests = Boolean(snapshot)
      liveServiceIds = snapshot?.services
        ?.map((service) => service.id)
        .filter((id): id is string => typeof id === "string") ?? []
      userId = website.user_id ?? null
      businessId = snapshot?.website.businessId || businessId || website.business_id || null
      businessName = snapshot?.business?.name || snapshot?.website.title || website.title || businessName
      businessEmail = snapshot?.business?.email || ""
      userEmail = snapshot?.ownerEmail || ""
    }
  }

  if (businessId && !businessEmail) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id, user_id, name, email")
      .eq("id", businessId)
      .maybeSingle()

    if (business) {
      userId = userId || business.user_id || null
      businessEmail = business.email || ""
      businessName = business.name || businessName
    }
  }

  if (userId && !userEmail) {
    const { data } = await supabase.auth.admin.getUserById(userId)
    userEmail = data?.user?.email || ""
  }

  const recipientEmail = businessEmail || userEmail || input.recipientEmail || FROM_EMAIL

  return { supabase, websiteId, businessId, userId, recipientEmail, businessName, acceptsPublicRequests, liveServiceIds }
}

function buildEmailHtml(input: {
  requestLabel: string
  businessName: string
  name: string
  email: string
  phone: string
  service: string
  preferredDate: string
  budget: string
  message: string
  recipientEmail: string
}) {
  const rows = [
    ["Naam", input.name],
    ["E-mail", input.email],
    ["Telefoon", input.phone],
    ["Gewenste dienst", input.service],
    ["Gewenste datum", input.preferredDate],
    ["Budget", input.budget],
  ].filter(([, value]) => value)

  return `
    <div style="margin:0;padding:32px 20px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.10);">
        <div style="padding:32px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;">
          <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;opacity:.85;">${input.requestLabel}</p>
          <h1 style="margin:0;font-size:30px;line-height:1.15;">Nieuwe aanvraag via ${input.businessName}</h1>
        </div>
        <div style="padding:30px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${rows
              .map(
                ([label, value]) => `
                  <tr>
                    <td style="width:155px;padding:10px 0;color:#64748b;font-weight:700;vertical-align:top;">${label}</td>
                    <td style="padding:10px 0;color:#0f172a;">${value}</td>
                  </tr>
                `,
              )
              .join("")}
          </table>
          <div style="padding:20px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;white-space:pre-wrap;line-height:1.7;">${input.message || "Geen bericht ingevuld."}</div>
          <p style="margin:24px 0 0 0;color:#64748b;font-size:12px;line-height:1.7;">Ontvangen door: ${input.recipientEmail}<br/>Verzonden vanaf: ${FROM_EMAIL}</p>
        </div>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getRateLimitKey(request, "contact_form"), 8, 10 * 60 * 1000)
    if (!rateLimit.allowed) {
      logRejectedRequest("rate_limited", request, { resetAt: rateLimit.resetAt })
      return NextResponse.json({ error: "Te veel aanvragen. Probeer het later opnieuw." }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      logRejectedRequest("invalid_json", request)
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
    }

    if (hasHoneypotValue(body as Record<string, unknown>)) {
      logRejectedRequest("honeypot", request)
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
    }

    const tooLongFields = getTooLongFields(body as Record<string, unknown>)
    if (tooLongFields.length > 0) {
      logRejectedRequest("field_length", request, { fields: tooLongFields })
      return NextResponse.json({ error: "Een of meer velden zijn te lang." }, { status: 400 })
    }

    const requestType = normalizeRequestType(body.requestType)
    const name = limitString(body.name, FIELD_LIMITS.name)
    const email = limitString(body.email, FIELD_LIMITS.email).toLowerCase()
    const phone = limitString(body.phone, FIELD_LIMITS.phone)
    const service = limitString(body.service, FIELD_LIMITS.service)
    const requestedServiceId = limitString(body.serviceId, FIELD_LIMITS.serviceId)
    const preferredDate = limitString(body.date || body.preferredDate, FIELD_LIMITS.preferredDate)
    const budget = limitString(body.budget, FIELD_LIMITS.budget)
    const message = limitString(body.message, FIELD_LIMITS.message)
    const websiteId = limitString(body.websiteId, FIELD_LIMITS.websiteId)
    const businessId = limitString(body.businessId, FIELD_LIMITS.businessId)
    const source = limitString(body.source, FIELD_LIMITS.source) || "website_form"

    if (!name || !email || !EMAIL_PATTERN.test(email)) {
      logRejectedRequest("invalid_required_fields", request, { requestType, hasName: Boolean(name), hasEmail: Boolean(email) })
      return NextResponse.json({ error: "Vul een geldige naam en e-mailadres in." }, { status: 400 })
    }

    if (requestType === "contact" && !message) {
      return NextResponse.json({ error: "Bericht is verplicht." }, { status: 400 })
    }

    if (looksLikeSpam({ name, email, phone, service, budget, message })) {
      logRejectedRequest("spam_pattern", request, { requestType, websiteId, businessId })
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
    }

    const context = await resolveRequestContext({
      websiteId,
      businessId,
      recipientEmail: limitString(body.recipientEmail, FIELD_LIMITS.recipientEmail),
    })

    if (!context.acceptsPublicRequests) {
      logRejectedRequest("website_not_live", request, { websiteId })
      return NextResponse.json(
        { error: "Deze websiteversie staat niet live. Aanvragen zijn alleen beschikbaar op de live website." },
        { status: 409 },
      )
    }

    let calendarServiceId: string | null = null

    if (requestedServiceId && context.businessId && context.liveServiceIds.includes(requestedServiceId)) {
      const { data: linkedService } = await context.supabase
        .from("services")
        .select("id")
        .eq("id", requestedServiceId)
        .eq("business_id", context.businessId)
        .maybeSingle()

      calendarServiceId = linkedService?.id ?? null
    }

    const { data: contactRequest, error: insertError } = await context.supabase
      .from("contact_requests")
      .insert({
        website_id: context.websiteId,
        business_id: context.businessId,
        user_id: context.userId,
        request_type: requestType,
        name,
        email,
        phone,
        service,
        preferred_date: preferredDate,
        budget,
        message,
        payload: {
          requestType,
          phone,
          service,
          serviceId: requestedServiceId,
          preferredDate,
          budget,
          source,
        },
        recipient_email: context.recipientEmail,
        source,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[requests] Failed to store request:", insertError)
      return NextResponse.json({ error: "Aanvraag kon niet worden opgeslagen." }, { status: 500 })
    }

    const calendarDate = parsePreferredDate(preferredDate)
    let calendarEntryCreated = false

    if (
      context.businessId &&
      contactRequest?.id &&
      calendarDate &&
      (requestType === "appointment" || requestType === "booking_request")
    ) {
      const { error: calendarError } = await context.supabase.from("calendar_entries").insert({
        business_id: context.businessId,
        contact_request_id: contactRequest.id,
        service_id: calendarServiceId,
        entry_type: getCalendarEntryType(requestType),
        status: "pending",
        source: "contact_request",
        title: requestType === "booking_request" ? "Nieuwe boekingsaanvraag" : "Nieuwe afspraakaanvraag",
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        start_at: calendarDate.start_at,
        end_at: calendarDate.end_at,
        all_day: calendarDate.all_day,
        timezone: "Europe/Amsterdam",
        internal_notes: [service ? `Gewenste dienst: ${service}` : "", budget ? `Budget: ${budget}` : "", message]
          .filter(Boolean)
          .join("\n\n"),
        metadata: {
          request_type: requestType,
          preferred_date: preferredDate,
          service_id: calendarServiceId,
          source,
        },
      })

      if (calendarError) {
        console.error("[requests] Failed to create calendar entry:", calendarError)
      } else {
        calendarEntryCreated = true
      }
    }

    const transporter = createTransporter()
    let emailSent = false

    if (transporter) {
      const requestLabel = REQUEST_LABELS[requestType]
      try {
        await transporter.sendMail({
          from: `${FROM_NAME} <${process.env.SMTP_FROM?.trim() || process.env.SMTP_USER || FROM_EMAIL}>`,
          to: context.recipientEmail,
          replyTo: `${name} <${email}>`,
          subject: `${requestLabel} van ${name}`,
          html: buildEmailHtml({
            requestLabel,
            businessName: escapeHtml(context.businessName),
            name: escapeHtml(name),
            email: escapeHtml(email),
            phone: escapeHtml(phone),
            service: escapeHtml(service),
            preferredDate: escapeHtml(preferredDate),
            budget: escapeHtml(budget),
            message: escapeHtml(message),
            recipientEmail: escapeHtml(context.recipientEmail),
          }),
          text: `${requestLabel}\n\nNaam: ${name}\nE-mail: ${email}${phone ? `\nTelefoon: ${phone}` : ""}${service ? `\nDienst: ${service}` : ""}${preferredDate ? `\nGewenste datum: ${preferredDate}` : ""}${budget ? `\nBudget: ${budget}` : ""}\n\nBericht:\n${message || "Geen bericht ingevuld."}`,
        })
        emailSent = true
      } catch (emailError) {
        console.error("[requests] Failed to send notification email:", emailError)
      }
    }

    return NextResponse.json({ success: true, emailSent, calendarEntryCreated })
  } catch (error) {
    console.error("[requests] Error:", error)
    return NextResponse.json(
      { error: "Aanvraag kon niet worden verzonden. Probeer het later opnieuw." },
      { status: 500 },
    )
  }
}

