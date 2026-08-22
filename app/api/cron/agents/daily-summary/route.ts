import { NextResponse } from "next/server"
import { enqueueAgentJob } from "@/lib/agents/repository"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function amsterdamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { localDate: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Agent server configuration is incomplete." }, { status: 503 })
  const local = amsterdamNow()
  if (local.hour !== 17) return NextResponse.json({ skipped: true, reason: "outside_amsterdam_schedule" })
  const queued = await enqueueAgentJob(await createAdminClient(), {
    jobType: "platform.daily_summary",
    source: "daily_summary_cron",
    deduplicationKey: local.localDate,
    payload: { localDate: local.localDate },
    priority: 20,
  })
  return NextResponse.json({ queued: queued.created, jobId: queued.jobId })
}
