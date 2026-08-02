import { NextRequest, NextResponse } from "next/server"

import { getPrivateIcalFeed } from "@/lib/calendar/sync"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const limit = checkRateLimit(getRateLimitKey(request, "calendar_ical_export"), 120, 5 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel kalenderverzoeken." }, { status: 429 })
  const { token } = await context.params
  const calendar = await getPrivateIcalFeed(token)
  if (!calendar) return NextResponse.json({ error: "Kalenderfeed niet gevonden." }, { status: 404 })
  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="flexpagina-calendar.ics"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  })
}
