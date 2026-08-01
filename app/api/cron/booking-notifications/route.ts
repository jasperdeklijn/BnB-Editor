import { NextResponse } from "next/server"

import { deliverPendingBookingNotifications } from "@/lib/booking/notifications"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await deliverPendingBookingNotifications())
  } catch (error) {
    console.error("[booking-notifications] Retry delivery failed", error)
    return NextResponse.json({ error: "Boekingsmeldingen konden niet worden verwerkt." }, { status: 500 })
  }
}
