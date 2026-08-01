export type BookingMode = "appointment" | "stay"
export type BookingConfirmationMode = "request" | "instant"

export interface ServiceBookingSettings {
  service_id: string
  business_id: string
  booking_enabled: boolean
  booking_mode: BookingMode
  confirmation_mode: BookingConfirmationMode
  timezone: string
  duration_minutes: number
  slot_interval_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  minimum_notice_minutes: number
  booking_horizon_days: number
  capacity: number
  minimum_nights: number
  maximum_nights: number
  check_in_time: string
  check_out_time: string
  cancellation_cutoff_minutes: number
  created_at?: string
  updated_at?: string
}

export type ServiceBookingSettingsInput = Omit<
  ServiceBookingSettings,
  "service_id" | "business_id" | "created_at" | "updated_at"
>

export const DEFAULT_BOOKING_TIMEZONE = "Europe/Amsterdam"

export function createDefaultServiceBookingSettings(
  serviceId: string,
  businessId: string,
  bookingMode: BookingMode = "appointment",
): ServiceBookingSettings {
  return {
    service_id: serviceId,
    business_id: businessId,
    booking_enabled: false,
    booking_mode: bookingMode,
    confirmation_mode: "request",
    timezone: DEFAULT_BOOKING_TIMEZONE,
    duration_minutes: 60,
    slot_interval_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    minimum_notice_minutes: 1440,
    booking_horizon_days: 90,
    capacity: 1,
    minimum_nights: 1,
    maximum_nights: 30,
    check_in_time: "15:00",
    check_out_time: "11:00",
    cancellation_cutoff_minutes: 1440,
  }
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date())
    return true
  } catch {
    return false
  }
}

function integerBetween(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`)
  }
  return value
}

function normalizeTime(value: string, label: string) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value)
  if (!match) throw new Error(`${label} must use HH:mm.`)
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) throw new Error(`${label} is invalid.`)
  return `${match[1]}:${match[2]}`
}

export function validateServiceBookingSettingsInput(
  input: ServiceBookingSettingsInput,
): ServiceBookingSettingsInput {
  if (!isValidTimeZone(input.timezone)) throw new Error("Unknown booking timezone.")
  if (!(["appointment", "stay"] as string[]).includes(input.booking_mode)) throw new Error("Unknown booking mode.")
  if (!(["request", "instant"] as string[]).includes(input.confirmation_mode)) throw new Error("Unknown confirmation mode.")

  const minimumNights = integerBetween(input.minimum_nights, 1, 365, "Minimum nights")
  const maximumNights = integerBetween(input.maximum_nights, 1, 730, "Maximum nights")
  if (maximumNights < minimumNights) throw new Error("Maximum nights cannot be lower than minimum nights.")

  return {
    ...input,
    duration_minutes: integerBetween(input.duration_minutes, 5, 1440, "Duration"),
    slot_interval_minutes: integerBetween(input.slot_interval_minutes, 5, 1440, "Slot interval"),
    buffer_before_minutes: integerBetween(input.buffer_before_minutes, 0, 1440, "Buffer before"),
    buffer_after_minutes: integerBetween(input.buffer_after_minutes, 0, 1440, "Buffer after"),
    minimum_notice_minutes: integerBetween(input.minimum_notice_minutes, 0, 525600, "Minimum notice"),
    booking_horizon_days: integerBetween(input.booking_horizon_days, 1, 730, "Booking horizon"),
    capacity: integerBetween(input.capacity, 1, 10000, "Capacity"),
    minimum_nights: minimumNights,
    maximum_nights: maximumNights,
    check_in_time: normalizeTime(input.check_in_time, "Check-in time"),
    check_out_time: normalizeTime(input.check_out_time, "Check-out time"),
    cancellation_cutoff_minutes: integerBetween(input.cancellation_cutoff_minutes, 0, 525600, "Cancellation cutoff"),
  }
}
