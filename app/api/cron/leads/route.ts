import { NextResponse } from "next/server"
import { enqueueAgentJob } from "@/lib/agents/repository"
import { getAmsterdamScheduleContext } from "@/lib/leads/amsterdamSchedule"
import { getLeadAgentSettings } from "@/lib/leads/settings"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Lead-agent server configuration is incomplete." }, { status: 503 })

  const schedule = getAmsterdamScheduleContext()
  if (!schedule.isMondayAtNine) return NextResponse.json({ skipped: true, reason: "outside_amsterdam_schedule" })
  const supabase = await createAdminClient()
  const settings = await getLeadAgentSettings(supabase)
  if (!settings.enabled) return NextResponse.json({ skipped: true, reason: "automation_disabled" })

  const { count, error } = await supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", schedule.weekStartedAt)
  if (error) return NextResponse.json({ error: "Weekly lead count failed." }, { status: 500 })
  const remaining = Math.max(0, settings.weekly_limit - (count ?? 0))
  if (remaining === 0) return NextResponse.json({ skipped: true, reason: "weekly_limit_reached" })

  const queued = await enqueueAgentJob(supabase, {
    jobType: "marketing.lead_search",
    source: "lead_cron",
    deduplicationKey: schedule.weekKey,
    payload: { weekKey: schedule.weekKey, cities: settings.cities, categories: settings.categories, limit: remaining, emailNotificationsEnabled: settings.email_notifications_enabled },
    priority: 40,
    riskLevel: "low",
  })
  return NextResponse.json({ queued: queued.created, jobId: queued.jobId, remaining })
}
