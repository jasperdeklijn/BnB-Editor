import type { ServiceBookingSettings } from "@/lib/booking/types"

export interface AvailabilityWindowInput {
  service_id: string | null
  weekday: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
}

export interface BusyCalendarEntryInput {
  service_id: string | null
  entry_type: "appointment" | "booking" | "blocked" | "note"
  status: "pending" | "confirmed" | "cancelled" | "completed" | "blocked"
  start_at: string
  end_at: string
}

export interface AppointmentAvailabilitySlot {
  local_date: string
  start_at: string
  end_at: string
  timezone: string
}

export interface StayAvailabilityOption {
  arrival_date: string
  departure_date: string
  nights: number
  start_at: string
  end_at: string
  timezone: string
}

export interface ServiceAvailabilityPreview {
  service_id: string
  enabled: boolean
  mode: "appointment" | "stay"
  appointment_slots: AppointmentAvailabilitySlot[]
  stay_options: StayAvailabilityOption[]
}

interface AvailabilityInput {
  settings: ServiceBookingSettings
  windows: AvailabilityWindowInput[]
  entries: BusyCalendarEntryInput[]
  date_from: string
  date_to: string
  now?: Date
  limit?: number
}

export type StayAvailabilityReason =
  | "available"
  | "disabled"
  | "wrong_mode"
  | "invalid_range"
  | "minimum_nights"
  | "maximum_nights"
  | "minimum_notice"
  | "booking_horizon"
  | "closed_arrival"
  | "closed_departure"
  | "conflict"
  | "invalid_local_time"

export interface StayAvailabilityCheck {
  available: boolean
  reason: StayAvailabilityReason
  nights: number
  start_at?: string
  end_at?: string
}

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

function parseDateId(dateId: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateId)
  if (!match) throw new Error("Dates must use YYYY-MM-DD.")
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new Error("Invalid calendar date.")
  }
  return { year, month, day }
}

function parseTimeId(timeId: string) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(timeId)
  if (!match) throw new Error("Times must use HH:mm.")
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) throw new Error("Invalid clock time.")
  return { hour, minute }
}

function dateIdFromUtcDate(date: Date) {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`
}

export function addLocalDays(dateId: string, days: number) {
  const { year, month, day } = parseDateId(dateId)
  return dateIdFromUtcDate(new Date(Date.UTC(year, month - 1, day + days)))
}

export function daysBetween(startDate: string, endDate: string) {
  const start = parseDateId(startDate)
  const end = parseDateId(endDate)
  return Math.round((Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day)) / DAY_MS)
}

function isoWeekday(dateId: string) {
  const { year, month, day } = parseDateId(dateId)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

export function localDateForInstant(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone)
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`
}

export function zonedDateTimeToUtc(dateId: string, timeId: string, timezone: string): Date | null {
  const date = parseDateId(dateId)
  const time = parseTimeId(timeId)
  const targetClock = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute)
  let candidate = targetClock

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = zonedParts(new Date(candidate), timezone)
    const representedClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const adjustment = targetClock - representedClock
    candidate += adjustment
    if (adjustment === 0) break
  }

  const result = new Date(candidate)
  const verified = zonedParts(result, timezone)
  if (
    verified.year !== date.year
    || verified.month !== date.month
    || verified.day !== date.day
    || verified.hour !== time.hour
    || verified.minute !== time.minute
  ) {
    return null
  }
  return result
}

function effectiveWindows(
  windows: AvailabilityWindowInput[],
  serviceId: string,
  weekday: number,
) {
  const serviceRows = windows.filter((window) => window.service_id === serviceId && window.weekday === weekday)
  const selected = serviceRows.length > 0
    ? serviceRows
    : windows.filter((window) => window.service_id === null && window.weekday === weekday)
  return selected.filter((window) => window.is_active)
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB
}

function isCapacityAvailable(
  start: Date,
  end: Date,
  settings: ServiceBookingSettings,
  entries: BusyCalendarEntryInput[],
) {
  const bufferedStart = start.getTime() - settings.buffer_before_minutes * MINUTE_MS
  const bufferedEnd = end.getTime() + settings.buffer_after_minutes * MINUTE_MS
  let occupancy = 0

  for (const entry of entries) {
    if (entry.status === "cancelled" || entry.status === "completed" || entry.entry_type === "note") continue
    const entryStart = new Date(entry.start_at).getTime()
    const entryEnd = new Date(entry.end_at).getTime()
    if (!Number.isFinite(entryStart) || !Number.isFinite(entryEnd)) continue
    const blocksService = entry.service_id === null || entry.service_id === settings.service_id
    if (!blocksService) continue
    if (entry.entry_type === "blocked" || entry.status === "blocked") {
      if (overlaps(bufferedStart, bufferedEnd, entryStart, entryEnd)) return false
      continue
    }
    if (entry.service_id === settings.service_id && (entry.status === "pending" || entry.status === "confirmed")) {
      const occupiedStart = entryStart - settings.buffer_before_minutes * MINUTE_MS
      const occupiedEnd = entryEnd + settings.buffer_after_minutes * MINUTE_MS
      if (!overlaps(start.getTime(), end.getTime(), occupiedStart, occupiedEnd)) continue
      occupancy += 1
      if (occupancy >= settings.capacity) return false
    }
  }

  return true
}

function effectiveDateTo(input: AvailabilityInput) {
  const now = input.now ?? new Date()
  const localToday = localDateForInstant(now, input.settings.timezone)
  const horizon = addLocalDays(localToday, input.settings.booking_horizon_days)
  return input.date_to < horizon ? input.date_to : horizon
}

export function getAppointmentAvailability(input: AvailabilityInput): AppointmentAvailabilitySlot[] {
  if (!input.settings.booking_enabled || input.settings.booking_mode !== "appointment") return []
  if (input.date_to < input.date_from) return []

  const now = input.now ?? new Date()
  const noticeBoundary = now.getTime() + input.settings.minimum_notice_minutes * MINUTE_MS
  const lastDate = effectiveDateTo(input)
  const limit = Math.max(1, input.limit ?? 12)
  const slots: AppointmentAvailabilitySlot[] = []

  for (let dateId = input.date_from; dateId <= lastDate && slots.length < limit; dateId = addLocalDays(dateId, 1)) {
    const windows = effectiveWindows(input.windows, input.settings.service_id, isoWeekday(dateId))
    for (const window of windows) {
      const windowStart = zonedDateTimeToUtc(dateId, window.start_time, window.timezone || input.settings.timezone)
      const windowEnd = zonedDateTimeToUtc(dateId, window.end_time, window.timezone || input.settings.timezone)
      if (!windowStart || !windowEnd || windowEnd <= windowStart) continue

      for (
        let slotStart = windowStart.getTime();
        slotStart + input.settings.duration_minutes * MINUTE_MS <= windowEnd.getTime() && slots.length < limit;
        slotStart += input.settings.slot_interval_minutes * MINUTE_MS
      ) {
        const start = new Date(slotStart)
        const end = new Date(slotStart + input.settings.duration_minutes * MINUTE_MS)
        if (start.getTime() < noticeBoundary) continue
        if (!isCapacityAvailable(start, end, input.settings, input.entries)) continue
        slots.push({
          local_date: dateId,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          timezone: input.settings.timezone,
        })
      }
    }
  }

  return slots
}

export function getStayAvailability(input: AvailabilityInput): StayAvailabilityOption[] {
  if (!input.settings.booking_enabled || input.settings.booking_mode !== "stay") return []
  if (input.date_to < input.date_from) return []

  const lastDate = effectiveDateTo(input)
  const limit = Math.max(1, input.limit ?? 12)
  const options: StayAvailabilityOption[] = []

  for (let arrival = input.date_from; arrival <= lastDate && options.length < limit; arrival = addLocalDays(arrival, 1)) {
    const departure = addLocalDays(arrival, input.settings.minimum_nights)
    if (departure > lastDate) break

    const check = checkStayAvailability({
      settings: input.settings,
      windows: input.windows,
      entries: input.entries,
      arrival_date: arrival,
      departure_date: departure,
      now: input.now,
    })
    if (!check.available || !check.start_at || !check.end_at) continue

    options.push({
      arrival_date: arrival,
      departure_date: departure,
      nights: input.settings.minimum_nights,
      start_at: check.start_at,
      end_at: check.end_at,
      timezone: input.settings.timezone,
    })
  }

  return options
}

export function checkStayAvailability(input: {
  settings: ServiceBookingSettings
  windows: AvailabilityWindowInput[]
  entries: BusyCalendarEntryInput[]
  arrival_date: string
  departure_date: string
  now?: Date
}): StayAvailabilityCheck {
  if (!input.settings.booking_enabled) return { available: false, reason: "disabled", nights: 0 }
  if (input.settings.booking_mode !== "stay") return { available: false, reason: "wrong_mode", nights: 0 }

  const nights = daysBetween(input.arrival_date, input.departure_date)
  if (nights <= 0) return { available: false, reason: "invalid_range", nights }
  if (nights < input.settings.minimum_nights) return { available: false, reason: "minimum_nights", nights }
  if (nights > input.settings.maximum_nights) return { available: false, reason: "maximum_nights", nights }

  const now = input.now ?? new Date()
  const localToday = localDateForInstant(now, input.settings.timezone)
  if (input.departure_date > addLocalDays(localToday, input.settings.booking_horizon_days)) {
    return { available: false, reason: "booking_horizon", nights }
  }

  if (effectiveWindows(input.windows, input.settings.service_id, isoWeekday(input.arrival_date)).length === 0) {
    return { available: false, reason: "closed_arrival", nights }
  }
  if (effectiveWindows(input.windows, input.settings.service_id, isoWeekday(input.departure_date)).length === 0) {
    return { available: false, reason: "closed_departure", nights }
  }

  const start = zonedDateTimeToUtc(input.arrival_date, input.settings.check_in_time, input.settings.timezone)
  const end = zonedDateTimeToUtc(input.departure_date, input.settings.check_out_time, input.settings.timezone)
  if (!start || !end || end <= start) return { available: false, reason: "invalid_local_time", nights }
  if (start.getTime() < now.getTime() + input.settings.minimum_notice_minutes * MINUTE_MS) {
    return { available: false, reason: "minimum_notice", nights }
  }
  if (!isCapacityAvailable(start, end, input.settings, input.entries)) {
    return { available: false, reason: "conflict", nights }
  }

  return {
    available: true,
    reason: "available",
    nights,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  }
}

export function getServiceAvailabilityPreview(input: AvailabilityInput): ServiceAvailabilityPreview {
  return {
    service_id: input.settings.service_id,
    enabled: input.settings.booking_enabled,
    mode: input.settings.booking_mode,
    appointment_slots: input.settings.booking_mode === "appointment" ? getAppointmentAvailability(input) : [],
    stay_options: input.settings.booking_mode === "stay" ? getStayAvailability(input) : [],
  }
}
