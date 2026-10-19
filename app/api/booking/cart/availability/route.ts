import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { resolveCartContext } from "@/lib/booking/cart-server"
import { cartSelectionSchema, getCartAvailability } from "@/lib/booking/cart"
import {
  bookingErrorResponse,
  PublicBookingError,
} from "@/lib/booking/public-context"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

const input = z.object({
  websiteId: z.string().uuid(),
  sectionId: z.string().min(1).max(100),
  locale: z.string().max(20).optional(),
  selection: cartSelectionSchema,
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export async function POST(request: NextRequest) {
  try {
    if (
      !(
        await checkRateLimit(
          getRateLimitKey(request, "booking_cart_availability"),
          60,
          300000,
        )
      ).allowed
    )
      throw new PublicBookingError(
        "Te veel controles. Probeer later opnieuw.",
        429,
      )
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      throw new PublicBookingError("Ongeldige selectie of datums.")
    const context = await resolveCartContext(parsed.data)
    let plans
    try {
      plans = getCartAvailability({
        ...context.planning,
        lines: context.lines,
        date_from: parsed.data.dateFrom,
        date_to: parsed.data.dateTo,
        limit: 96,
      })
    } catch {
      throw new PublicBookingError("Kies een periode van maximaal 31 dagen.")
    }
    const confirmationMode = context.lines.some(
      (line) =>
        context.planning.settings.find(
          (settings) => settings.service_id === line.service_id,
        )?.confirmation_mode === "request",
    )
      ? "request"
      : "instant"
    return NextResponse.json(
      { plans, confirmationMode },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    const result = bookingErrorResponse(error)
    return NextResponse.json(result, { status: result.status })
  }
}
