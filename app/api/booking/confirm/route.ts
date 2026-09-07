import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import {
  bookingErrorResponse,
  PublicBookingError,
  resolvePublicBookingContext,
} from "@/lib/booking/public-context"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { deliverBookingNotifications } from "@/lib/booking/notifications"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function text(value: unknown, maximum: number) {
  return (typeof value === "string" ? value.trim() : "").slice(0, maximum)
}

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(getRateLimitKey(request, "booking_confirm"), 8, 10 * 60 * 1000)
    if (!limit.allowed) {
      throw new PublicBookingError("Te veel boekingspogingen. Probeer het later opnieuw.", 429, "RATE_LIMITED")
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") throw new PublicBookingError("Ongeldige boekingsgegevens.")
    if (text(body.company, 200)) throw new PublicBookingError("Ongeldige boekingsgegevens.")

    const websiteId = text(body.websiteId, 80)
    const serviceId = text(body.serviceId, 80)
    const holdId = text(body.holdId, 80)
    const token = text(body.token, 200)
    const name = text(body.name, 120)
    const email = text(body.email, 254).toLowerCase()
    const phone = text(body.phone, 40)
    const message = text(body.message, 3000)

    if (!UUID_PATTERN.test(holdId) || token.length < 32 || !name || !EMAIL_PATTERN.test(email)) {
      throw new PublicBookingError("Vul een geldige naam en e-mailadres in.")
    }

    const context = await resolvePublicBookingContext({ websiteId, serviceId, locale: text(body.locale, 20) })
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const { data: hold, error: holdError } = await context.supabase
      .from("booking_holds")
      .select("website_id, service_id")
      .eq("id", holdId)
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (holdError || hold?.website_id !== context.websiteId || hold?.service_id !== context.service.id) {
      throw new PublicBookingError("Deze tijdelijke reservering is ongeldig of verlopen.", 409, "BOOKING_HOLD_INVALID")
    }

    const { data, error } = await context.supabase.rpc("finalize_public_booking", {
      p_hold_id: holdId,
      p_token_hash: tokenHash,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_message: message,
      p_locale: context.locale,
      p_recipient_email: context.recipientEmail,
    })

    if (error) {
      if (error.message.includes("BOOKING_HOLD_INVALID")) {
        throw new PublicBookingError("Deze tijdelijke reservering is verlopen. Kies opnieuw.", 409, "BOOKING_HOLD_INVALID")
      }
      if (error.message.includes("BOOKING_SLOT_UNAVAILABLE")) {
        throw new PublicBookingError("Dit moment is niet meer beschikbaar. Kies opnieuw.", 409, "BOOKING_SLOT_UNAVAILABLE")
      }
      console.error("[booking] Failed to finalize booking", error)
      throw new PublicBookingError("De boeking kon niet worden opgeslagen.", 500)
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.calendar_entry_id) throw new PublicBookingError("De boeking kon niet worden opgeslagen.", 500)

    if (result.contact_request_id) {
      const { error: inboxError } = await context.supabase.from("contact_request_messages").insert({
        contact_request_id: result.contact_request_id,
        business_id: context.businessId,
        direction: "inbound",
        sender_email: email,
        sender_name: name,
        recipient_email: context.recipientEmail,
        subject: context.settings.booking_mode === "stay" ? "Boekingsaanvraag" : "Afspraakaanvraag",
        body: message,
        delivery_status: "received",
        idempotency_key: `contact-request:${result.contact_request_id}`,
        sent_at: new Date().toISOString(),
      })
      if (inboxError) {
        // Booking finalization remains transactional and valid when the optional inbox migration is not deployed yet.
        console.error("[booking] Booking saved but inbox history could not be stored", inboxError)
      }

      if (result.booking_status === "confirmed") {
        const now = new Date().toISOString()
        const { error: inquiryError } = await context.supabase
          .from("contact_requests")
          .update({ status: "won", status_changed_at: now, last_activity_at: now, closed_at: now, closed_reason: "Direct bevestigde boeking" })
          .eq("id", result.contact_request_id)
          .eq("business_id", context.businessId)
        if (inquiryError) console.error("[booking] Booking confirmed but linked enquiry could not be marked won", inquiryError)
      }
    }

    let notification = { sent: 0, failed: 0, skipped: 0 }
    try {
      notification = await deliverBookingNotifications(result.calendar_entry_id)
    } catch (notificationError) {
      console.error("[booking] Booking saved but initial notifications could not be dispatched", notificationError)
      notification.failed = 1
    }

    return NextResponse.json({
      status: result.booking_status,
      calendarEntryId: result.calendar_entry_id,
      contactRequestId: result.contact_request_id,
      notification,
    })
  } catch (error) {
    const response = bookingErrorResponse(error)
    return NextResponse.json({ error: response.error, code: response.code }, { status: response.status })
  }
}
