const updatedFormatter = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

export function formatReservationUpdated(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "—"

  // ICU versions differ in punctuation. Use the same separators in SSR and browsers.
  const parts = updatedFormatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ""
  return `${part("day")}-${part("month")}-${part("year")}, ${part("hour")}:${part("minute")}`
}
