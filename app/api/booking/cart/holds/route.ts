import { randomBytes, randomUUID } from "node:crypto"
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
import { cartSelectionSchema } from "@/lib/booking/cart"

const input = z.object({
  websiteId: z.string().uuid(),
  sectionId: z.string().min(1).max(100),
  locale: z.string().max(20).optional(),
  selection: cartSelectionSchema,
  startAt: z.string().datetime({ offset: true }),
})
export async function POST(request: NextRequest) {
  try {
    if (
      !(
        await checkRateLimit(
          getRateLimitKey(request, "booking_cart_hold"),
          12,
          600000,
        )
      ).allowed
    )
      throw new PublicBookingError(
        "Te veel boekingspogingen. Probeer later opnieuw.",
        429,
      )
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      throw new PublicBookingError("Kies geldige diensten en een tijdstip.")
    const context = await resolveCartContext(parsed.data)
    const plan = await cartPlanForStart(context, parsed.data.startAt)
    const token = randomBytes(32).toString("base64url")
    const { data, error } = await context.supabase.rpc(
      "create_booking_cart_hold",
      {
        p_website_id: context.websiteId,
        p_business_id: context.businessId,
        p_section_id: context.section.id,
        p_version: context.snapshot.publishedAt,
        p_selection: context.selection,
        p_plan: plan,
        p_token_hash: hashCartToken(token),
        p_idempotency_key: randomUUID(),
      },
    )
    if (error) throw cartRpcError(error)
    return NextResponse.json(
      { ...data, token },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    const result = bookingErrorResponse(error)
    return NextResponse.json(result, { status: result.status })
  }
}
export async function DELETE(request: NextRequest) {
  try {
    if (
      !(
        await checkRateLimit(
          getRateLimitKey(request, "booking_cart_release"),
          30,
          600000,
        )
      ).allowed
    )
      throw new PublicBookingError("Te veel pogingen.", 429)
    const parsed = z
      .object({ holdId: z.string().uuid(), token: z.string().min(32).max(200) })
      .safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      throw new PublicBookingError("Ongeldige tijdelijke reservering.")
    const db = await createAdminClient()
    const { error } = await db.rpc("cancel_booking_cart_hold", {
      p_id: parsed.data.holdId,
      p_hash: hashCartToken(parsed.data.token),
    })
    if (error) throw cartRpcError(error)
    return NextResponse.json({ success: true })
  } catch (error) {
    const result = bookingErrorResponse(error)
    return NextResponse.json(result, { status: result.status })
  }
}
