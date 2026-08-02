import { addLocalDays, daysBetween, localDateForInstant, zonedDateTimeToUtc } from "@/lib/booking/availability"

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
}

type Property = { params: Record<string, string>; value: string }
type PropertyMap = Map<string, Property[]>

type DateValue = {
  instant: Date
  dateId: string
  timeId: string
  timezone: string
  allDay: boolean
}

const MAX_IMPORTED_EVENTS = 5_000
const MAX_EVENT_DURATION_MS = 366 * 86_400_000

function unfoldLines(value: string) {
  return value.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/)
}

function parseProperty(line: string): { name: string; property: Property } | null {
  const separator = line.indexOf(":")
  if (separator <= 0) return null
  const descriptor = line.slice(0, separator).split(";")
  const name = descriptor.shift()?.toUpperCase()
  if (!name) return null
  const params: Record<string, string> = {}
  for (const parameter of descriptor) {
    const equals = parameter.indexOf("=")
    if (equals > 0) params[parameter.slice(0, equals).toUpperCase()] = parameter.slice(equals + 1).replace(/^"|"$/g, "")
  }
  return { name, property: { params, value: line.slice(separator + 1) } }
}

function propertyMap(lines: string[]) {
  const properties: PropertyMap = new Map()
  for (const line of lines) {
    const parsed = parseProperty(line)
    if (!parsed) continue
    properties.set(parsed.name, [...(properties.get(parsed.name) ?? []), parsed.property])
  }
  return properties
}

function first(properties: PropertyMap, name: string) {
  return properties.get(name)?.[0]
}

function unescapeText(value: string) {
  return value
    .replace(/\\[nN]/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim()
}

function sanitizeUid(value: string) {
  return Array.from(value).filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && code !== 127
  }).join("").trim().slice(0, 1000)
}

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return value
  } catch {
    return "Europe/Amsterdam"
  }
}

function dateId(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function timeId(hour: number, minute: number, second = 0) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`
}

function parseDateValue(property: Property, fallbackTimezone: string): DateValue {
  const raw = property.value.trim()
  const timezone = validTimezone(property.params.TZID || fallbackTimezone)
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
  if (dateOnly) {
    const localDate = dateId(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]))
    const instant = zonedDateTimeToUtc(localDate, "00:00", timezone)
    if (!instant) throw new Error("De iCal-feed bevat een ongeldige datum.")
    return { instant, dateId: localDate, timeId: "00:00:00", timezone, allDay: true }
  }

  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{4})?$/.exec(raw)
  if (!dateTime) throw new Error("De iCal-feed bevat een niet-ondersteund datumformaat.")
  const localDate = dateId(Number(dateTime[1]), Number(dateTime[2]), Number(dateTime[3]))
  const localTime = timeId(Number(dateTime[4]), Number(dateTime[5]), Number(dateTime[6] || 0))
  const suffix = dateTime[7]
  let instant: Date | null
  if (suffix === "Z") {
    instant = new Date(Date.UTC(
      Number(dateTime[1]), Number(dateTime[2]) - 1, Number(dateTime[3]),
      Number(dateTime[4]), Number(dateTime[5]), Number(dateTime[6] || 0),
    ))
  } else if (suffix) {
    const offsetSign = suffix[0] === "+" ? 1 : -1
    const offsetMinutes = offsetSign * (Number(suffix.slice(1, 3)) * 60 + Number(suffix.slice(3, 5)))
    instant = new Date(Date.UTC(
      Number(dateTime[1]), Number(dateTime[2]) - 1, Number(dateTime[3]),
      Number(dateTime[4]), Number(dateTime[5]) - offsetMinutes, Number(dateTime[6] || 0),
    ))
  } else {
    instant = zonedDateTimeToUtc(localDate, localTime, timezone)
  }
  if (!instant || !Number.isFinite(instant.getTime())) throw new Error("De iCal-feed bevat een ongeldige lokale tijd.")
  return { instant, dateId: localDate, timeId: localTime, timezone: suffix === "Z" ? "UTC" : timezone, allDay: false }
}

function durationMilliseconds(value: string) {
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value)
  if (!match) throw new Error("De iCal-feed bevat een niet-ondersteunde duur.")
  return (
    Number(match[1] || 0) * 7 * 86_400_000
    + Number(match[2] || 0) * 86_400_000
    + Number(match[3] || 0) * 3_600_000
    + Number(match[4] || 0) * 60_000
    + Number(match[5] || 0) * 1_000
  )
}

function endForEvent(properties: PropertyMap, start: DateValue, fallbackTimezone: string) {
  const endProperty = first(properties, "DTEND")
  if (endProperty) return parseDateValue(endProperty, fallbackTimezone).instant
  const duration = first(properties, "DURATION")
  if (duration) return new Date(start.instant.getTime() + durationMilliseconds(duration.value))
  if (start.allDay) {
    const nextMidnight = zonedDateTimeToUtc(addLocalDays(start.dateId, 1), "00:00", start.timezone)
    if (!nextMidnight) throw new Error("De iCal-feed bevat een ongeldige hele-daggebeurtenis.")
    return nextMidnight
  }
  return new Date(start.instant.getTime() + 3_600_000)
}

function recurringEnd(
  properties: PropertyMap,
  masterStart: DateValue,
  occurrenceStart: Date,
  duration: number,
  fallbackTimezone: string,
) {
  if (!masterStart.allDay) return new Date(occurrenceStart.getTime() + duration)
  const endProperty = first(properties, "DTEND")
  const dayCount = endProperty
    ? Math.max(1, daysBetween(masterStart.dateId, parseDateValue(endProperty, fallbackTimezone).dateId))
    : Math.max(1, Math.round(duration / 86_400_000))
  const occurrenceDate = localDateForInstant(occurrenceStart, masterStart.timezone)
  const end = zonedDateTimeToUtc(addLocalDays(occurrenceDate, dayCount), "00:00", masterStart.timezone)
  if (!end) throw new Error("De iCal-feed bevat een ongeldige terugkerende hele-daggebeurtenis.")
  return end
}

function parseRule(value: string) {
  const rule = Object.fromEntries(value.split(";").map((part) => {
    const [key, ...rest] = part.split("=")
    return [key.toUpperCase(), rest.join("=")]
  }))
  const supported = new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYMONTH"])
  const unsupported = Object.keys(rule).filter((key) => !supported.has(key))
  if (unsupported.length) throw new Error(`De iCal-herhaling gebruikt niet-ondersteunde regels: ${unsupported.join(", ")}.`)
  if (!rule.FREQ || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(rule.FREQ)) {
    throw new Error("De iCal-feed bevat een niet-ondersteund herhalingspatroon.")
  }
  return rule
}

const WEEKDAYS: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function calendarParts(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return { year, month, day }
}

function monthsBetween(start: string, current: string) {
  const a = calendarParts(start)
  const b = calendarParts(current)
  return (b.year - a.year) * 12 + b.month - a.month
}

function matchesRecurrenceDate(start: DateValue, currentDate: string, rule: Record<string, string>) {
  const interval = Math.max(1, Number(rule.INTERVAL || 1))
  const dayDifference = daysBetween(start.dateId, currentDate)
  const current = calendarParts(currentDate)
  const startParts = calendarParts(start.dateId)
  const weekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay()
  const byDays = rule.BYDAY?.split(",").map((value) => {
    if (!/^(MO|TU|WE|TH|FR|SA|SU)$/.test(value)) {
      throw new Error("Complexe maandelijkse BYDAY-regels worden nog niet ondersteund.")
    }
    return WEEKDAYS[value]
  })
  const byMonthDays = rule.BYMONTHDAY?.split(",").map(Number)
  const byMonths = rule.BYMONTH?.split(",").map(Number)

  if (byDays && !byDays.includes(weekday)) return false
  if (byMonthDays && !byMonthDays.includes(current.day)) return false
  if (byMonths && !byMonths.includes(current.month)) return false

  if (rule.FREQ === "DAILY") return dayDifference % interval === 0
  if (rule.FREQ === "WEEKLY") {
    const effectiveDays = byDays ?? [new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day)).getUTCDay()]
    return Math.floor(dayDifference / 7) % interval === 0 && effectiveDays.includes(weekday)
  }
  if (rule.FREQ === "MONTHLY") {
    return monthsBetween(start.dateId, currentDate) % interval === 0
      && (Boolean(byMonthDays || byDays) || current.day === startParts.day)
  }
  return (current.year - startParts.year) % interval === 0
    && (byMonths ? true : current.month === startParts.month)
    && (Boolean(byMonthDays || byDays) || current.day === startParts.day)
}

function occurrenceInstant(start: DateValue, occurrenceDate: string) {
  if (start.allDay || start.timezone !== "UTC") {
    return zonedDateTimeToUtc(occurrenceDate, start.timeId, start.timezone)
  }
  const parts = calendarParts(occurrenceDate)
  const [hour, minute, second] = start.timeId.split(":").map(Number)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second))
}

function expandStarts(properties: PropertyMap, start: DateValue, rangeStart: Date, rangeEnd: Date, fallbackTimezone: string) {
  const ruleProperty = first(properties, "RRULE")
  const explicitDates = properties.get("RDATE") ?? []
  if (!ruleProperty && explicitDates.length === 0) return [start.instant]

  const starts: Date[] = []
  if (ruleProperty) {
    const rule = parseRule(ruleProperty.value)
    const count = rule.COUNT ? Math.max(0, Number(rule.COUNT)) : Number.POSITIVE_INFINITY
    if (!Number.isFinite(count) && rule.COUNT) throw new Error("De iCal-feed bevat een ongeldige herhalingslimiet.")
    const until = rule.UNTIL ? parseDateValue({ params: {}, value: rule.UNTIL }, fallbackTimezone).instant : rangeEnd
    let generated = 0
    const rangeStartDate = localDateForInstant(rangeStart, start.timezone)
    const lastDate = localDateForInstant(rangeEnd, start.timezone)
    const firstDate = Number.isFinite(count) || rangeStartDate < start.dateId ? start.dateId : rangeStartDate
    if (daysBetween(firstDate, lastDate) > 50_000) throw new Error("De iCal-herhaling bestrijkt een onveilig grote periode.")
    for (let current = firstDate; current <= lastDate && generated < count; current = addLocalDays(current, 1)) {
      if (!matchesRecurrenceDate(start, current, rule)) continue
      const instant = occurrenceInstant(start, current)
      if (!instant || instant < start.instant || instant > until || instant > rangeEnd) continue
      generated += 1
      if (instant >= rangeStart) starts.push(instant)
    }
  } else {
    starts.push(start.instant)
  }

  for (const property of explicitDates) {
    for (const value of property.value.split(",")) {
      const parsed = parseDateValue({ ...property, value }, fallbackTimezone).instant
      if (parsed >= rangeStart && parsed <= rangeEnd) starts.push(parsed)
    }
  }
  return starts
}

export function parseIcalBusyEvents(
  input: string,
  options: { now?: Date; pastDays?: number; futureDays?: number } = {},
): ParsedIcalCalendar {
  if (!/BEGIN:VCALENDAR/i.test(input) || !/END:VCALENDAR/i.test(input)) {
    throw new Error("De opgegeven URL bevat geen geldige iCal-kalender.")
  }
  const lines = unfoldLines(input)
  const calendarLevelLines: string[] = []
  let eventDepth = 0
  for (const line of lines) {
    if (line.toUpperCase() === "BEGIN:VEVENT") eventDepth += 1
    else if (line.toUpperCase() === "END:VEVENT") eventDepth = Math.max(0, eventDepth - 1)
    else if (eventDepth === 0) calendarLevelLines.push(line)
  }
  const calendarProperties = propertyMap(calendarLevelLines)
  const fallbackTimezone = validTimezone(first(calendarProperties, "X-WR-TIMEZONE")?.value || "Europe/Amsterdam")
  const calendarId = first(calendarProperties, "X-FLEXPAGINA-CALENDAR-ID")?.value.trim() || null
  const eventBlocks: string[][] = []
  let current: string[] | null = null
  for (const line of lines) {
    if (line.toUpperCase() === "BEGIN:VEVENT") current = []
    else if (line.toUpperCase() === "END:VEVENT" && current) {
      eventBlocks.push(current)
      current = null
    } else if (current) current.push(line)
  }

  const now = options.now ?? new Date()
  const rangeStart = new Date(now.getTime() - (options.pastDays ?? 30) * 86_400_000)
  const rangeEnd = new Date(now.getTime() + (options.futureDays ?? 730) * 86_400_000)
  const masters = new Map<string, PropertyMap>()
  const overrides = new Map<string, PropertyMap>()
  let ignoredCount = 0

  for (const block of eventBlocks) {
    const properties = propertyMap(block)
    const uidValue = first(properties, "UID")?.value
    const uid = uidValue ? sanitizeUid(uidValue) : ""
    if (!uid || !first(properties, "DTSTART")) {
      ignoredCount += 1
      continue
    }
    const recurrenceId = first(properties, "RECURRENCE-ID")
    if (recurrenceId) {
      const key = `${uid}\u0000${parseDateValue(recurrenceId, fallbackTimezone).instant.toISOString()}`
      overrides.set(key, properties)
    } else {
      masters.set(uid, properties)
    }
  }

  const events = new Map<string, IcalBusyEvent>()
  for (const [uid, properties] of masters) {
    const status = first(properties, "STATUS")?.value.toUpperCase()
    const transparent = first(properties, "TRANSP")?.value.toUpperCase() === "TRANSPARENT"
    if (status === "CANCELLED" || transparent) {
      ignoredCount += 1
      continue
    }
    const start = parseDateValue(first(properties, "DTSTART")!, fallbackTimezone)
    const end = endForEvent(properties, start, fallbackTimezone)
    const duration = end.getTime() - start.instant.getTime()
    if (duration <= 0 || duration > MAX_EVENT_DURATION_MS) throw new Error("De iCal-feed bevat een onveilige gebeurtenisduur.")
    const excluded = new Set((properties.get("EXDATE") ?? []).flatMap((property) => property.value.split(",").map((value) => (
      parseDateValue({ ...property, value }, fallbackTimezone).instant.toISOString()
    ))))
    for (const occurrenceStart of expandStarts(properties, start, rangeStart, rangeEnd, fallbackTimezone)) {
      const occurrenceKey = occurrenceStart.toISOString()
      if (excluded.has(occurrenceKey)) continue
      const override = overrides.get(`${uid}\u0000${occurrenceKey}`)
      if (override) {
        overrides.delete(`${uid}\u0000${occurrenceKey}`)
        if (first(override, "STATUS")?.value.toUpperCase() === "CANCELLED") continue
        const overrideStart = parseDateValue(first(override, "DTSTART")!, fallbackTimezone)
        const overrideEnd = endForEvent(override, overrideStart, fallbackTimezone)
        events.set(`${uid}\u0000${occurrenceKey}`, {
          uid, occurrenceKey, startAt: overrideStart.instant.toISOString(), endAt: overrideEnd.toISOString(),
          allDay: overrideStart.allDay,
          summary: unescapeText(first(override, "SUMMARY")?.value || first(properties, "SUMMARY")?.value || "Extern bezet"),
        })
      } else {
        events.set(`${uid}\u0000${occurrenceKey}`, {
          uid, occurrenceKey, startAt: occurrenceStart.toISOString(),
          endAt: recurringEnd(properties, start, occurrenceStart, duration, fallbackTimezone).toISOString(), allDay: start.allDay,
          summary: unescapeText(first(properties, "SUMMARY")?.value || "Extern bezet"),
        })
      }
      if (events.size > MAX_IMPORTED_EVENTS) throw new Error("De iCal-feed bevat te veel gebeurtenissen.")
    }
  }

  for (const [key, properties] of overrides) {
    if (first(properties, "STATUS")?.value.toUpperCase() === "CANCELLED") continue
    const [uid, recurrenceId] = key.split("\u0000")
    const start = parseDateValue(first(properties, "DTSTART")!, fallbackTimezone)
    const end = endForEvent(properties, start, fallbackTimezone)
    if (end > rangeStart && start.instant < rangeEnd) {
      events.set(key, {
        uid, occurrenceKey: recurrenceId, startAt: start.instant.toISOString(), endAt: end.toISOString(),
        allDay: start.allDay, summary: unescapeText(first(properties, "SUMMARY")?.value || "Extern bezet"),
      })
    }
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

function foldLine(line: string) {
  const chunks: string[] = []
  let remaining = line
  while (remaining.length > 73) {
    chunks.push(remaining.slice(0, 73))
    remaining = ` ${remaining.slice(73)}`
  }
  chunks.push(remaining)
  return chunks
}

export function createIcalFeed(input: { businessId: string; calendarName: string; entries: IcalExportEntry[] }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FlexPagina//Booking Calendar 2.0//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(input.calendarName || "FlexPagina kalender")}`,
    `X-FLEXPAGINA-CALENDAR-ID:${input.businessId}`,
  ]
  const stamp = utcTimestamp(new Date())
  for (const entry of input.entries) {
    const imported = entry.source === "import"
    const summary = imported ? "Extern bezet" : entry.title || "Gereserveerd"
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@flexpagina.nl`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${utcTimestamp(entry.updated_at)}`,
      `DTSTART:${utcTimestamp(entry.start_at)}`,
      `DTEND:${utcTimestamp(entry.end_at)}`,
      `SUMMARY:${escapeText(summary)}`,
      `STATUS:${entry.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    )
  }
  lines.push("END:VCALENDAR")
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`
}
