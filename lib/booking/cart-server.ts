import "server-only"
import { createHash } from "node:crypto"
import {
  cartSelectionSchema,
  resolveCartLines,
  buildCartPlan,
  getCartAvailability,
  type CartPlan,
} from "@/lib/booking/cart"
import { getCartPresentation } from "@/lib/booking/cart-settings"
import { loadBookingPlanning } from "@/lib/booking/planning-data"
import {
  PublicBookingError,
  resolvePublicBookingContext,
} from "@/lib/booking/public-context"
import { localDateForInstant } from "@/lib/booking/availability"

export function hashCartToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}
export async function resolveCartContext(
  body: {
    websiteId: string
    sectionId: string
    locale?: string
    selection: unknown
  },
  excludeHold?: string,
) {
  const parsed = cartSelectionSchema.safeParse(body.selection)
  if (!parsed.success)
    throw new PublicBookingError(
      "Kies maximaal tien geldige diensten en opties.",
    )
  const context = await resolvePublicBookingContext({
    websiteId: body.websiteId,
    serviceId: parsed.data[0].service_id,
    locale: body.locale,
  })
  const section = context.snapshot.sections.find(
    (candidate) =>
      candidate.id === body.sectionId && candidate.type === "services",
  )
  if (
    !section ||
    section.data.bookingSpaceEnabled !== true ||
    section.data.bookingSpaceMode !== "calendar" ||
    section.data.bookingCartEnabled !== true
  )
    throw new PublicBookingError("Deze boekingslijst is niet beschikbaar.", 404)
  const bookingIds = Array.isArray(section.data.bookingSpaceServiceIds)
    ? section.data.bookingSpaceServiceIds
    : []
  const selected = bookingIds.length
    ? bookingIds
    : Array.isArray(section.data.serviceIds)
      ? section.data.serviceIds
      : []
  const presentation = getCartPresentation(section.data)
  for (const item of parsed.data) {
    if (
      (selected.length && !selected.includes(item.service_id)) ||
      !context.snapshot.services.some(
        (service) =>
          service.id === item.service_id &&
          service.business_id === context.businessId,
      )
    )
      throw new PublicBookingError(
        "Deze dienst is niet beschikbaar in deze boekingslijst.",
      )
    if (
      item.extra_ids.some((extra) =>
        presentation.hiddenExtraIds.includes(`${item.service_id}:${extra}`),
      )
    )
      throw new PublicBookingError(
        "Deze extra is niet beschikbaar in deze boekingslijst.",
      )
  }
  let lines
  try {
    lines = resolveCartLines(parsed.data, context.snapshot.services)
  } catch (error) {
    throw new PublicBookingError(
      error instanceof Error ? error.message : "Ongeldige dienstopties.",
    )
  }
  const planning = excludeHold
    ? await loadBookingPlanning(
        context.supabase,
        context.businessId,
        excludeHold,
      )
    : context.planning
  if (
    lines.some(
      (line) =>
        !planning.settings.some(
          (settings) =>
            settings.service_id === line.service_id &&
            settings.booking_enabled &&
            settings.booking_mode === "appointment",
        ),
    )
  )
    throw new PublicBookingError(
      "Een gekozen dienst is niet meer online boekbaar.",
      409,
    )
  return {
    ...context,
    section,
    presentation,
    selection: parsed.data,
    lines,
    planning,
  }
}

export async function cartPlanForStart(
  context: Awaited<ReturnType<typeof resolveCartContext>>,
  startAt: string,
  exactStart = true,
): Promise<CartPlan> {
  const start = new Date(startAt)
  if (!Number.isFinite(start.getTime()))
    throw new PublicBookingError("Kies een geldige datum en tijd.")
  const date = localDateForInstant(start, context.settings.timezone)
  const input = {
    ...context.planning,
    lines: context.lines,
    date_from: date,
    date_to: date,
    limit: 300,
  }
  const plan = exactStart
    ? getCartAvailability(input).find(
        (plan) => plan.start_at === start.toISOString(),
      )
    : buildCartPlan(input, start.toISOString())
  if (!plan)
    throw new PublicBookingError(
      "Deze combinatie past niet meer op dit tijdstip. Kies opnieuw.",
      409,
      "BOOKING_SLOT_UNAVAILABLE",
    )
  return plan
}

export function cartRpcError(error: { message: string }) {
  if (/BOOKING_SLOT_UNAVAILABLE/.test(error.message))
    return new PublicBookingError(
      "Dit moment is net bezet geraakt. Kies opnieuw.",
      409,
      "BOOKING_SLOT_UNAVAILABLE",
    )
  if (/BOOKING_HOLD_INVALID/.test(error.message))
    return new PublicBookingError(
      "Je tijdelijke reservering is verlopen. Kies opnieuw.",
      409,
      "BOOKING_HOLD_INVALID",
    )
  if (
    /BOOKING_QUOTE_CHANGED|BOOKING_CONTEXT_UNAVAILABLE|BOOKING_DISABLED/.test(
      error.message,
    )
  )
    return new PublicBookingError(
      "Het aanbod of de boekbaarheid is gewijzigd. Vernieuw de boekingslijst.",
      409,
      "BOOKING_QUOTE_CHANGED",
    )
  console.error("[booking-cart] Database action failed", error)
  return new PublicBookingError(
    "De boeking kon niet worden opgeslagen. Probeer opnieuw.",
    503,
  )
}
