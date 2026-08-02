import { NextRequest, NextResponse } from "next/server"

import {
  addLocalDays,
  checkStayAvailability,
  daysBetween,
  getAppointmentAvailability,
  getAvailabilityDaySummaries,
  getStayAvailability,
  localDateForInstant,
} from "@/lib/booking/availability"
import {
  bookingErrorResponse,
  getBusyEntries,
  PublicBookingError,
  resolvePublicBookingContext,
} from "@/lib/booking/public-context"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

function parseDate(value: string | null, label: string) {
  if (!value || !DATE_PATTERN.test(value)) throw new PublicBookingError(`${label} ontbreekt of is ongeldig.`)
  try {
    daysBetween(value, value)
  } catch {
    throw new PublicBookingError(`${label} ontbreekt of is ongeldig.`)
  }
  return value
}

function queryRange(startDate: string, endDate: string) {
  return {
    start: new Date(new Date(`${startDate}T00:00:00.000Z`).getTime() - 2 * DAY_MS),
    end: new Date(new Date(`${endDate}T00:00:00.000Z`).getTime() + 3 * DAY_MS),
  }
}

export async function GET(request: NextRequest) {
  try {
    const limit = checkRateLimit(getRateLimitKey(request, "booking_availability"), 60, 5 * 60 * 1000)
    if (!limit.allowed) {
      throw new PublicBookingError("Te veel beschikbaarheidscontroles. Probeer het later opnieuw.", 429, "RATE_LIMITED")
    }

    const params = request.nextUrl.searchParams
    const websiteId = params.get("websiteId") ?? ""
    const serviceId = params.get("serviceId") ?? ""
    const context = await resolvePublicBookingContext({ websiteId, serviceId, locale: params.get("locale") ?? undefined })
    const localToday = localDateForInstant(new Date(), context.settings.timezone)
    const horizonDate = addLocalDays(localToday, context.settings.booking_horizon_days)
    const dateFrom = parseDate(params.get("dateFrom") || localToday, "Begindatum")
    const dateTo = parseDate(params.get("dateTo") || dateFrom, "Einddatum")

    if (daysBetween(dateFrom, dateTo) < 0 || daysBetween(dateFrom, dateTo) > 31) {
      throw new PublicBookingError("Vraag beschikbaarheid voor maximaal 31 dagen tegelijk op.")
    }

    const arrivalDate = params.get("arrivalDate")
    const departureDate = params.get("departureDate")
    let rangeStartDate = dateFrom
    let rangeEndDate = dateTo

    if (context.settings.booking_mode === "stay" && (arrivalDate || departureDate)) {
      rangeStartDate = parseDate(arrivalDate, "Aankomstdatum")
      rangeEndDate = parseDate(departureDate, "Vertrekdatum")
      const nights = daysBetween(rangeStartDate, rangeEndDate)
      if (nights <= 0 || nights > 730) throw new PublicBookingError("Kies een geldige verblijfsperiode.")
    }

    const range = queryRange(rangeStartDate, rangeEndDate)
    const entries = await getBusyEntries(context, range.start, range.end)
    const availabilityInput = {
      settings: context.settings,
      windows: context.snapshot.availabilityWindows,
      entries,
      date_from: dateFrom,
      date_to: dateTo,
      limit: 96,
    }

    const appointmentSlots = context.settings.booking_mode === "appointment"
      ? getAppointmentAvailability(availabilityInput)
      : []
    const availabilityDays = getAvailabilityDaySummaries(availabilityInput)
    const stayOptions = context.settings.booking_mode === "stay" && !arrivalDate && !departureDate
      ? getStayAvailability({ ...availabilityInput, limit: 31 })
      : []
    const stayCheck = context.settings.booking_mode === "stay" && arrivalDate && departureDate
      ? checkStayAvailability({
          settings: context.settings,
          windows: context.snapshot.availabilityWindows,
          entries,
          arrival_date: rangeStartDate,
          departure_date: rangeEndDate,
        })
      : null

    return NextResponse.json({
      service: { id: context.service.id, title: context.serviceTitle },
      settings: {
        booking_mode: context.settings.booking_mode,
        confirmation_mode: context.settings.confirmation_mode,
        timezone: context.settings.timezone,
        minimum_nights: context.settings.minimum_nights,
        maximum_nights: context.settings.maximum_nights,
        check_in_time: context.settings.check_in_time,
        check_out_time: context.settings.check_out_time,
      },
      date_bounds: { minimum: localToday, maximum: horizonDate },
      appointment_slots: appointmentSlots,
      availability_days: availabilityDays,
      stay_options: stayOptions,
      stay_check: stayCheck,
    }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const response = bookingErrorResponse(error)
    return NextResponse.json({ error: response.error, code: response.code }, { status: response.status })
  }
}
