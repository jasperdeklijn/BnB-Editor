import { createHash, randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import {
  checkStayAvailability,
  daysBetween,
  getAppointmentAvailability,
  localDateForInstant,
} from "@/lib/booking/availability"
import {
  bookingErrorResponse,
  getBusyEntries,
  PublicBookingError,
  resolvePublicBookingContext,
} from "@/lib/booking/public-context"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

const DAY_MS = 86_400_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function rangeAround(startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new PublicBookingError("Kies een geldige datum en tijd.")
  }
  return {
    start: new Date(start.getTime() - 2 * DAY_MS),
    end: new Date(end.getTime() + 2 * DAY_MS),
  }
}

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(getRateLimitKey(request, "booking_hold"), 12, 10 * 60 * 1000)
    if (!limit.allowed) {
      throw new PublicBookingError("Te veel boekingspogingen. Probeer het later opnieuw.", 429, "RATE_LIMITED")
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") throw new PublicBookingError("Ongeldige boekingsgegevens.")

    const websiteId = asString(body.websiteId)
    const serviceId = asString(body.serviceId)
    const context = await resolvePublicBookingContext({ websiteId, serviceId, locale: asString(body.locale) })
    let startAt = ""
    let endAt = ""

    if (context.settings.booking_mode === "appointment") {
      startAt = asString(body.startAt)
      endAt = asString(body.endAt)
      const range = rangeAround(startAt, endAt)
      const entries = await getBusyEntries(context, range.start, range.end)
      const date = localDateForInstant(new Date(startAt), context.settings.timezone)
      const exactSlot = getAppointmentAvailability({
        settings: context.settings,
        windows: context.snapshot.availabilityWindows,
        entries,
        date_from: date,
        date_to: date,
        limit: 96,
      }).find((slot) => slot.start_at === startAt && slot.end_at === endAt)
      if (!exactSlot) throw new PublicBookingError("Dit tijdstip is niet meer beschikbaar.", 409, "BOOKING_SLOT_UNAVAILABLE")
    } else {
      const arrivalDate = asString(body.arrivalDate)
      const departureDate = asString(body.departureDate)
      try {
        if (!DATE_PATTERN.test(arrivalDate) || !DATE_PATTERN.test(departureDate) || daysBetween(arrivalDate, departureDate) <= 0) {
          throw new Error("invalid")
        }
      } catch {
        throw new PublicBookingError("Kies een geldige verblijfsperiode.")
      }
      const approximateStart = `${arrivalDate}T00:00:00.000Z`
      const approximateEnd = `${departureDate}T23:59:59.999Z`
      const range = rangeAround(approximateStart, approximateEnd)
      const entries = await getBusyEntries(context, range.start, range.end)
      const stay = checkStayAvailability({
        settings: context.settings,
        windows: context.snapshot.availabilityWindows,
        entries,
        arrival_date: arrivalDate,
        departure_date: departureDate,
      })
      if (!stay.available || !stay.start_at || !stay.end_at) {
        throw new PublicBookingError("Deze verblijfsperiode is niet meer beschikbaar.", 409, "BOOKING_SLOT_UNAVAILABLE")
      }
      startAt = stay.start_at
      endAt = stay.end_at
    }

    const token = randomBytes(32).toString("base64url")
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const { data, error } = await context.supabase.rpc("create_public_booking_hold", {
      p_website_id: context.websiteId,
      p_business_id: context.businessId,
      p_service_id: context.service.id,
      p_booking_mode: context.settings.booking_mode,
      p_start_at: startAt,
      p_end_at: endAt,
      p_timezone: context.settings.timezone,
      p_token_hash: tokenHash,
    })

    if (error) {
      if (error.message.includes("BOOKING_SLOT_UNAVAILABLE")) {
        throw new PublicBookingError("Dit moment is net door iemand anders gekozen.", 409, "BOOKING_SLOT_UNAVAILABLE")
      }
      console.error("[booking] Failed to create hold", error)
      throw new PublicBookingError("De boekingsmodule is nog niet beschikbaar.", 503, "BOOKING_SCHEMA_UNAVAILABLE")
    }

    const hold = Array.isArray(data) ? data[0] : data
    if (!hold?.hold_id) throw new PublicBookingError("De boeking kon niet tijdelijk worden vastgezet.", 500)

    return NextResponse.json({
      holdId: hold.hold_id,
      token,
      expiresAt: hold.hold_expires_at,
      startAt,
      endAt,
    })
  } catch (error) {
    const response = bookingErrorResponse(error)
    return NextResponse.json({ error: response.error, code: response.code }, { status: response.status })
  }
}
