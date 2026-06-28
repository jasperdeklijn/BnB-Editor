import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createAdminClient } from "@/lib/supabase/admin"
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

function normalizeRequestType(value: unknown): RequestType {
  if (value === "quote" || value === "appointment" || value === "booking_request" || value === "whatsapp") {
    return value
  }
  return "contact"
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
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
  let websiteId = input.websiteId || null
  let businessId = input.businessId || null
  let userId: string | null = null
  let businessEmail = ""
  let userEmail = ""
  let businessName = "uw website"

  if (websiteId) {
    const { data: website } = await supabase
      .from("websites")
      .select("id, user_id, business_id, title")
      .eq("id", websiteId)
      .maybeSingle()

    if (website) {
      userId = website.user_id ?? null
      businessId = businessId || website.business_id || null
      businessName = website.title || businessName
    }
  }

  if (businessId) {
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

  if (userId) {
    const { data } = await supabase.auth.admin.getUserById(userId)
    userEmail = data?.user?.email || ""
  }

  const recipientEmail = input.recipientEmail || businessEmail || userEmail || FROM_EMAIL

  return { supabase, websiteId, businessId, userId, recipientEmail, businessName }
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
    const body = await request.json()
    const requestType = normalizeRequestType(body.requestType)
    const name = getString(body.name)
    const email = getString(body.email)
    const phone = getString(body.phone)
    const service = getString(body.service)
    const preferredDate = getString(body.date || body.preferredDate)
    const budget = getString(body.budget)
    const message = getString(body.message)
    const websiteId = getString(body.websiteId)
    const businessId = getString(body.businessId)
    const source = getString(body.source) || "website_form"

    if (!name || !email) {
      return NextResponse.json({ error: "Naam en e-mail zijn verplicht." }, { status: 400 })
    }

    if (requestType === "contact" && !message) {
      return NextResponse.json({ error: "Bericht is verplicht." }, { status: 400 })
    }

    const context = await resolveRequestContext({
      websiteId,
      businessId,
      recipientEmail: getString(body.recipientEmail),
    })

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
        payload: body ?? {},
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
      await transporter.sendMail({
        from: `${FROM_NAME} <${process.env.SMTP_FROM?.trim() || process.env.SMTP_USER || FROM_EMAIL}>`,
        to: context.recipientEmail,
        replyTo: `${name} <${email}>`,
        subject: `${requestLabel} van ${name}`,
        html: buildEmailHtml({
          requestLabel,
          businessName: context.businessName,
          name,
          email,
          phone,
          service,
          preferredDate,
          budget,
          message,
          recipientEmail: context.recipientEmail,
        }),
        text: `${requestLabel}\n\nNaam: ${name}\nE-mail: ${email}${phone ? `\nTelefoon: ${phone}` : ""}${service ? `\nDienst: ${service}` : ""}${preferredDate ? `\nGewenste datum: ${preferredDate}` : ""}${budget ? `\nBudget: ${budget}` : ""}\n\nBericht:\n${message || "Geen bericht ingevuld."}`,
      })
      emailSent = true
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

