import { NextResponse } from "next/server"

import { synchronizeDueCalendarSources } from "@/lib/calendar/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await synchronizeDueCalendarSources())
  } catch (error) {
    console.error("[calendar-sync] Scheduled import failed", error)
    return NextResponse.json({ error: "Kalenderimports konden niet worden verwerkt." }, { status: 500 })
  }
}
