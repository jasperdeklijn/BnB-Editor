import { createHash } from "node:crypto"

import ICAL from "ical.js"

import { addLocalDays, localDateForInstant, zonedDateTimeToUtc } from "@/lib/booking/availability"

export interface IcalBusyEvent {
  uid: string
  occurrenceKey: string
  startAt: string
  endAt: string
  allDay: boolean
  summary: string
}

export interface ParsedIcalCalendar {
  calendarId: string | null
  events: IcalBusyEvent[]
  ignoredCount: number
}

export interface IcalExportEntry {
  id: string
  title: string
  source: string
  status: string
  start_at: string
  end_at: string
  updated_at: string
  all_day?: boolean
  timezone?: string
}

const MAX_IMPORTED_EVENTS = 5_000
const MAX_ITERATIONS = 50_000
const MAX_EVENT_DURATION_MS = 366 * 86_400_000

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function sanitizeUid(value: string) {
  return Array.from(value).filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && code !== 127
  }).join("").trim().slice(0, 1000)
}

function stableFallbackUid(component: ICAL.Component) {
  const identity = ["dtstart", "dtend", "duration", "recurrence-id", "summary"]
    .map((name) => component.getFirstProperty(name)?.toICALString() ?? "")
    .join("\n")
  return `fallback-${createHash("sha256").update(identity).digest("hex")}`
}

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return value
  } catch {
    return "Europe/Amsterdam"
  }
}

function dateId(time: ICAL.Time) {
  return `${String(time.year).padStart(4, "0")}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`
}

function timeId(time: ICAL.Time) {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}:${String(time.second).padStart(2, "0")}`
}

function instantForTime(time: ICAL.Time, fallbackTimezone: string) {
  const timezoneId = safeString(time.zone?.tzid)
  if (timezoneId === "UTC" || timezoneId === "Z") return time.toJSDate()
  if (time.isDate) {
    const instant = zonedDateTimeToUtc(dateId(time), "00:00", validTimezone(timezoneId || fallbackTimezone))
    if (!instant) throw new Error("De iCal-feed bevat een ongeldige hele-dagdatum.")
    return instant
  }
  if (timezoneId && timezoneId !== "floating") {
    try {
      const instant = zonedDateTimeToUtc(dateId(time), timeId(time), validTimezone(timezoneId))
      if (instant) return instant
    } catch {
      // Embedded VTIMEZONE definitions are handled by ICAL.js below.
    }
  }
  const libraryDate = time.toJSDate()
  if (Number.isFinite(libraryDate.getTime()) && timezoneId && timezoneId !== "floating") return libraryDate
  const fallback = zonedDateTimeToUtc(dateId(time), timeId(time), fallbackTimezone)
  if (!fallback) throw new Error("De iCal-feed bevat een ongeldige lokale tijd.")
  return fallback
}

function statusFor(component: ICAL.Component) {
  return safeString(component.getFirstPropertyValue("status")).toUpperCase()
}

function isTransparent(component: ICAL.Component) {
  return safeString(component.getFirstPropertyValue("transp")).toUpperCase() === "TRANSPARENT"
}

function registerEmbeddedTimezones(calendar: ICAL.Component) {
  for (const component of calendar.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(new ICAL.Timezone(component))
    } catch {
      // A malformed timezone will be caught when its event date is normalized.
    }
  }
}

function addOccurrence(
  target: Map<string, IcalBusyEvent>,
  uid: string,
  details: ReturnType<ICAL.Event["getOccurrenceDetails"]>,
  fallbackTimezone: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const component = details.item.component
  if (statusFor(component) === "CANCELLED" || isTransparent(component)) return false
  const start = instantForTime(details.startDate, fallbackTimezone)
  const end = instantForTime(details.endDate, fallbackTimezone)
  const duration = end.getTime() - start.getTime()
  if (duration <= 0 || duration > MAX_EVENT_DURATION_MS) {
    throw new Error("De iCal-feed bevat een onveilige gebeurtenisduur.")
  }
  if (end <= rangeStart || start >= rangeEnd) return false
  const recurrenceInstant = instantForTime(details.recurrenceId, fallbackTimezone)
  const occurrenceKey = recurrenceInstant.toISOString()
  target.set(`${uid}\u0000${occurrenceKey}`, {
    uid,
    occurrenceKey,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    allDay: details.startDate.isDate,
    summary: safeString(component.getFirstPropertyValue("summary")) || "Extern bezet",
  })
  if (target.size > MAX_IMPORTED_EVENTS) throw new Error("De iCal-feed bevat te veel gebeurtenissen.")
  return true
}

export function parseIcalBusyEvents(
  input: string,
  options: { now?: Date; pastDays?: number; futureDays?: number } = {},
): ParsedIcalCalendar {
  let calendar: ICAL.Component
  try {
    calendar = new ICAL.Component(ICAL.parse(input))
  } catch {
    throw new Error("De opgegeven URL bevat geen geldige iCal-kalender.")
  }
  if (calendar.name !== "vcalendar") throw new Error("De opgegeven URL bevat geen geldige iCal-kalender.")
  registerEmbeddedTimezones(calendar)
  const fallbackTimezone = validTimezone(safeString(calendar.getFirstPropertyValue("x-wr-timezone")) || "Europe/Amsterdam")
  const calendarId = safeString(calendar.getFirstPropertyValue("x-flexpagina-business-id"))
    || safeString(calendar.getFirstPropertyValue("x-flexpagina-calendar-id"))
    || null
  const now = options.now ?? new Date()
  const rangeStart = new Date(now.getTime() - (options.pastDays ?? 30) * 86_400_000)
  const rangeEnd = new Date(now.getTime() + (options.futureDays ?? 730) * 86_400_000)
  const components = calendar.getAllSubcomponents("vevent")
  let ignoredCount = 0

  for (const component of components) {
    if (!component.getFirstProperty("dtstart")) {
      ignoredCount += 1
      continue
    }
    const rawUid = sanitizeUid(safeString(component.getFirstPropertyValue("uid")))
    if (!rawUid) component.updatePropertyWithValue("uid", stableFallbackUid(component))
  }

  const events = new Map<string, IcalBusyEvent>()
  const exceptions = components.filter((component) => component.getFirstProperty("recurrence-id"))
  const masters = components.filter((component) => !component.getFirstProperty("recurrence-id"))
  for (const component of masters) {
    if (!component.getFirstProperty("dtstart")) continue
    if (statusFor(component) === "CANCELLED" || isTransparent(component)) {
      ignoredCount += 1
      continue
    }
    const uid = sanitizeUid(safeString(component.getFirstPropertyValue("uid"))) || stableFallbackUid(component)
    const relatedExceptions = exceptions.filter((candidate) => (
      sanitizeUid(safeString(candidate.getFirstPropertyValue("uid"))) === uid
    ))
    const event = new ICAL.Event(component, { exceptions: relatedExceptions })
    if (!event.isRecurring()) {
      const details = {
        recurrenceId: event.startDate,
        item: event,
        startDate: event.startDate,
        endDate: event.endDate,
      }
      if (!addOccurrence(events, uid, details, fallbackTimezone, rangeStart, rangeEnd)) ignoredCount += 1
      continue
    }

    const iterator = event.iterator()
    let iterations = 0
    while (iterations < MAX_ITERATIONS) {
      const occurrence = iterator.next()
      if (!occurrence) break
      const occurrenceInstant = instantForTime(occurrence, fallbackTimezone)
      if (occurrenceInstant >= rangeEnd) break
      const details = event.getOccurrenceDetails(occurrence)
      if (!addOccurrence(events, uid, details, fallbackTimezone, rangeStart, rangeEnd)) ignoredCount += 1
      iterations += 1
    }
    if (iterations >= MAX_ITERATIONS) throw new Error("De iCal-herhaling bestrijkt een onveilig grote periode.")
  }

  for (const component of exceptions) {
    const uid = sanitizeUid(safeString(component.getFirstPropertyValue("uid"))) || stableFallbackUid(component)
    const recurrence = component.getFirstPropertyValue("recurrence-id")
    const recurrenceTime = recurrence instanceof ICAL.Time ? recurrence : null
    if (!recurrenceTime || events.has(`${uid}\u0000${instantForTime(recurrenceTime, fallbackTimezone).toISOString()}`)) continue
    const event = new ICAL.Event(component)
    const details = {
      recurrenceId: recurrenceTime,
      item: event,
      startDate: event.startDate,
      endDate: event.endDate,
    }
    if (!addOccurrence(events, uid, details, fallbackTimezone, rangeStart, rangeEnd)) ignoredCount += 1
  }

  return { calendarId, events: [...events.values()], ignoredCount }
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

function utcTimestamp(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function compactDate(value: string) {
  return value.replace(/-/g, "")
}

function foldLine(line: string) {
  const chunks: string[] = []
  let current = ""
  let byteLength = 0
  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, "utf8")
    if (byteLength + characterBytes > 75 && current) {
      chunks.push(current)
      current = ` ${character}`
      byteLength = 1 + characterBytes
    } else {
      current += character
      byteLength += characterBytes
    }
  }
  chunks.push(current)
  return chunks
}

export function createIcalFeed(input: {
  businessId: string
  calendarId: string
  calendarName: string
  entries: IcalExportEntry[]
  genericSummary?: string | null
  forceDateOnly?: boolean
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FlexPagina//Booking Calendar 2.0//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(input.calendarName || "FlexPagina kalender")}`,
    `X-FLEXPAGINA-CALENDAR-ID:${input.calendarId}`,
    `X-FLEXPAGINA-BUSINESS-ID:${input.businessId}`,
  ]
  const stamp = utcTimestamp(new Date())
  for (const entry of input.entries) {
    const imported = entry.source === "import"
    const summary = input.genericSummary || (imported ? "Extern bezet" : entry.title || "Gereserveerd")
    const dateOnly = input.forceDateOnly || entry.all_day === true
    const timezone = validTimezone(entry.timezone || "Europe/Amsterdam")
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@flexpagina.nl`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${utcTimestamp(entry.updated_at)}`,
    )
    if (dateOnly) {
      const startDate = localDateForInstant(new Date(entry.start_at), timezone)
      let endDate = localDateForInstant(new Date(entry.end_at), timezone)
      if (endDate <= startDate) endDate = addLocalDays(startDate, 1)
      lines.push(`DTSTART;VALUE=DATE:${compactDate(startDate)}`, `DTEND;VALUE=DATE:${compactDate(endDate)}`)
    } else {
      lines.push(`DTSTART:${utcTimestamp(entry.start_at)}`, `DTEND:${utcTimestamp(entry.end_at)}`)
    }
    lines.push(
      `SUMMARY:${escapeText(summary)}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    )
  }
  lines.push("END:VCALENDAR")
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`
}
