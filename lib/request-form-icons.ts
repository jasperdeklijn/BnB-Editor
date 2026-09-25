import type { SectionIconId } from "./section-icons"
export function requestFormIcon(type: unknown): SectionIconId {
  if (type === "appointment" || type === "booking_request") return "tabler:calendar-event"
  if (type === "quote") return "tabler:receipt"
  if (type === "whatsapp") return "tabler:phone"
  return "tabler:message"
}
