import "server-only"

import { createHash } from "node:crypto"
import nodemailer from "nodemailer"

import { createCustomerBookingLink } from "@/lib/booking/customer-access"
import { PLATFORM_EMAILS } from "@/lib/platform"
import { createAdminClient } from "@/lib/supabase/admin"

type NotificationRow = {
  id: string
  calendar_entry_id: string
  notification_type: string
  recipient_type: "customer" | "owner"
  recipient_email: string
  locale: string
  idempotency_key: string
  attempts: number
  payload: Record<string, unknown>
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function notificationCopy(type: string, title: string) {
  const copy: Record<string, { subject: string; heading: string; body: string }> = {
    request_received: { subject: `Aanvraag ontvangen: ${title}`, heading: "Uw aanvraag is ontvangen", body: "De ondernemer beoordeelt uw aanvraag. Via de beveiligde link kunt u de status bekijken." },
    confirmed: { subject: `Bevestigd: ${title}`, heading: "Uw boeking is bevestigd", body: "Uw boeking staat bevestigd in de planning." },
    declined: { subject: `Aanvraag afgewezen: ${title}`, heading: "Uw aanvraag kon niet worden bevestigd", body: "De ondernemer heeft uw aanvraag afgewezen. Bekijk de status via de beveiligde link." },
    rescheduled: { subject: `Nieuw tijdstip: ${title}`, heading: "Uw boeking is verplaatst", body: "Het tijdstip van uw boeking is aangepast." },
    cancelled: { subject: `Geannuleerd: ${title}`, heading: "Uw boeking is geannuleerd", body: "De annulering is verwerkt." },
    alternative_proposed: { subject: `Alternatief tijdstip voorgesteld: ${title}`, heading: "Er is een alternatief tijdstip voorgesteld", body: "Bekijk en accepteer het voorstel via de beveiligde link." },
    reschedule_declined: { subject: `Verplaatsingsverzoek beoordeeld: ${title}`, heading: "Uw verplaatsingsverzoek is beoordeeld", body: "Bekijk de actuele status via de beveiligde link." },
    new_request: { subject: `Nieuwe boekingsaanvraag: ${title}`, heading: "Nieuwe aanvraag", body: "Er staat een nieuwe aanvraag klaar in de boekingskalender." },
    new_booking: { subject: `Nieuwe bevestigde boeking: ${title}`, heading: "Nieuwe boeking", body: "Er is een nieuwe bevestigde boeking aan de kalender toegevoegd." },
    customer_cancelled: { subject: `Klant annuleerde: ${title}`, heading: "Boeking geannuleerd door klant", body: "De klant heeft de boeking via de beveiligde klantomgeving geannuleerd." },
    customer_reschedule_requested: { subject: `Verplaatsingsverzoek: ${title}`, heading: "Klant vraagt een ander tijdstip", body: "Bekijk het voorgestelde tijdstip in de boekingskalender." },
  }
  return copy[type] ?? { subject: `Boekingsupdate: ${title}`, heading: "Boekingsupdate", body: "Er is een wijziging in de boeking." }
}

function formatRange(payload: Record<string, unknown>, locale: string) {
  const start = typeof payload.proposedStartAt === "string" ? payload.proposedStartAt : String(payload.startAt || "")
  const end = typeof payload.proposedEndAt === "string" ? payload.proposedEndAt : String(payload.endAt || "")
  if (!start || !end) return ""
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: String(payload.timezone || "Europe/Amsterdam") })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

async function deliverNotification(row: NotificationRow) {
  const supabase = await createAdminClient()
  if (!EMAIL_PATTERN.test(row.recipient_email)) {
    await supabase.from("booking_notifications").update({ status: "skipped", last_error: "Ongeldig e-mailadres." }).eq("id", row.id)
    return "skipped" as const
  }

  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const password = process.env.SMTP_PASS
  if (!host || !user || !password) {
    await supabase.from("booking_notifications").update({ status: "failed", attempts: row.attempts + 1, last_error: "SMTP is niet ingesteld." }).eq("id", row.id)
    return "failed" as const
  }

  const { data: locked } = await supabase.from("booking_notifications")
    .update({ status: "sending", attempts: row.attempts + 1, last_error: null })
    .eq("id", row.id).in("status", ["pending", "failed"]).select("id").maybeSingle()
  if (!locked) return "skipped" as const

  const title = String(row.payload.title || "Boeking")
  const copy = notificationCopy(row.notification_type, title)
  const range = formatRange(row.payload, row.locale || "nl-NL")
  const messageId = `<booking-${createHash("sha256").update(row.idempotency_key).digest("hex").slice(0, 28)}@${(process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "flexpagina.nl").toLowerCase()}>`
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass: password },
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  })

  try {
    const link = row.recipient_type === "customer"
      ? await createCustomerBookingLink(row.calendar_entry_id)
      : `https://${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "FlexPagina.nl"}/editor/calendar?booking=${row.calendar_entry_id}`
    const info = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME?.trim() || "FlexPagina boekingen"} <${process.env.SMTP_FROM?.trim() || user || PLATFORM_EMAILS.info}>`,
      to: row.recipient_email,
      subject: copy.subject,
      text: `${copy.heading}\n\n${copy.body}${range ? `\n\n${range}` : ""}\n\n${link}`,
      html: `<div style="background:#f3f4f6;padding:32px 16px;font-family:Arial,sans-serif;color:#16302b"><div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:28px"><h1 style="font-size:24px">${escapeHtml(copy.heading)}</h1><p style="line-height:1.7">${escapeHtml(copy.body)}</p>${range ? `<p style="font-weight:700">${escapeHtml(range)}</p>` : ""}<a href="${escapeHtml(link)}" style="display:inline-block;background:#16302b;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none">${row.recipient_type === "customer" ? "Bekijk boeking" : "Open kalender"}</a></div></div>`,
      messageId,
      headers: { "X-FlexPagina-Booking-Notification": row.id },
    })
    await supabase.from("booking_notifications").update({ status: "sent", message_id: info.messageId || messageId, sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id)
    return "sent" as const
  } catch (error) {
    await supabase.from("booking_notifications").update({ status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "SMTP-verzending mislukt." }).eq("id", row.id)
    return "failed" as const
  } finally {
    transporter.close()
  }
}

export async function deliverBookingNotifications(calendarEntryId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from("booking_notifications").select("*")
    .eq("calendar_entry_id", calendarEntryId).in("status", ["pending", "failed"]).lt("attempts", 5).order("created_at")
  if (error) throw error
  const results = []
  for (const row of (data ?? []) as NotificationRow[]) results.push(await deliverNotification(row))
  return {
    sent: results.filter((result) => result === "sent").length,
    failed: results.filter((result) => result === "failed").length,
    skipped: results.filter((result) => result === "skipped").length,
  }
}

export async function deliverPendingBookingNotifications(limit = 50) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from("booking_notifications")
    .select("calendar_entry_id")
    .in("status", ["pending", "failed"])
    .lt("attempts", 5)
    .order("created_at")
    .limit(Math.max(1, Math.min(limit, 100)))
  if (error) throw error
  const entryIds = [...new Set((data ?? []).map((row) => row.calendar_entry_id))]
  const totals = { entries: entryIds.length, sent: 0, failed: 0, skipped: 0 }
  for (const entryId of entryIds) {
    const result = await deliverBookingNotifications(entryId)
    totals.sent += result.sent
    totals.failed += result.failed
    totals.skipped += result.skipped
  }
  return totals
}
