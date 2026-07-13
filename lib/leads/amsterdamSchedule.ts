import "server-only"

const TIME_ZONE = "Europe/Amsterdam"
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: map.weekday,
    hour: Number(map.hour),
  }
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const representedAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  )
  return representedAsUtc - date.getTime()
}

export function getAmsterdamScheduleContext(now = new Date()) {
  const local = getParts(now)
  const weekdayIndex = Math.max(0, WEEKDAYS.indexOf(local.weekday))
  const localDateAsUtc = new Date(Date.UTC(local.year, local.month - 1, local.day))
  localDateAsUtc.setUTCDate(localDateAsUtc.getUTCDate() - weekdayIndex)

  const year = localDateAsUtc.getUTCFullYear()
  const month = localDateAsUtc.getUTCMonth()
  const day = localDateAsUtc.getUTCDate()
  const weekKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  const midnightGuess = new Date(Date.UTC(year, month, day, 0, 0, 0))
  const offset = getTimeZoneOffsetMs(midnightGuess)
  const weekStartedAt = new Date(midnightGuess.getTime() - offset).toISOString()

  return {
    isMondayAtNine: local.weekday === "Mon" && local.hour === 9,
    weekKey,
    weekStartedAt,
  }
}
