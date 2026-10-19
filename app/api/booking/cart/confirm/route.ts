import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  cartPlanForStart,
  cartRpcError,
  hashCartToken,
  resolveCartContext,
} from "@/lib/booking/cart-server"
import {
  bookingErrorResponse,
  PublicBookingError,
} from "@/lib/booking/public-context"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { deliverBookingNotifications } from "@/lib/booking/notifications"
import { recordAnalyticsConversion } from "@/lib/analytics/server"

const input = z.object({
  holdId: z.string().uuid(),
  token: z.string().min(32).max(200),
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: z.string().max(40).default(""),
  message: z.string().max(3000).default(""),
  company: z.string().max(200).default(""),
  locale: z.string().max(20).optional(),
})
export async function POST(request: NextRequest) {
  try {
    if (
      !(
        await checkRateLimit(
          getRateLimitKey(request, "booking_cart_confirm"),
          8,
          600000,
        )
      ).allowed
    )
      throw new PublicBookingError(
        "Te veel boekingspogingen. Probeer later opnieuw.",
        429,
      )
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success || parsed.data.company)
      throw new PublicBookingError("Vul een geldige naam en e-mailadres in.")
    const body = parsed.data,
      db = await createAdminClient(),
      hash = hashCartToken(body.token)
    const { data: hold, error: holdError } = await db
      .from("booking_cart_holds")
      .select("*")
      .eq("id", body.holdId)
      .eq("token_hash", hash)
      .maybeSingle()
    if (holdError || !hold)
      throw new PublicBookingError(
        "De tijdelijke reservering is ongeldig.",
        409,
        "BOOKING_HOLD_INVALID",
      )
    if (hold.status === "consumed") {
      const { data: existing, error } = await db
        .from("booking_groups")
        .select("id,leader_id,status")
        .eq("id", hold.id)
        .maybeSingle()
      if (error || !existing?.leader_id)
        throw new PublicBookingError(
          "De bevestiging kon niet worden opgehaald.",
          503,
        )
      return NextResponse.json(
        {
          calendarEntryId: existing.leader_id,
          groupId: existing.id,
          status: existing.status,
        },
        { headers: { "Cache-Control": "no-store" } },
      )
    }
    const context = await resolveCartContext(
      {
        websiteId: hold.website_id,
        sectionId: hold.section_id,
        selection: hold.selection,
        locale: body.locale,
      },
      hold.id,
    )
    // Retries use the immutable original quote; a consumed hold must not create another booking.
    const plan = await cartPlanForStart(context, hold.plan.start_at, false)
    const { data, error } = await db.rpc("confirm_booking_cart", {
      p_id: hold.id,
      p_hash: hash,
      p_plan: plan,
      p_customer: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
      },
      p_locale: context.locale,
      p_recipient: context.recipientEmail,
    })
    if (error) throw cartRpcError(error)
    try {
      await recordAnalyticsConversion(
        request,
        context.websiteId,
        "booking",
        data.calendarEntryId,
      )
      await deliverBookingNotifications(data.calendarEntryId)
    } catch (error) {
      console.error(
        "[booking-cart] Booking saved; post-commit delivery will retry",
        error,
      )
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const result = bookingErrorResponse(error)
    return NextResponse.json(result, { status: result.status })
  }
}
