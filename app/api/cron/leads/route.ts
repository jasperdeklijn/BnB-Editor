import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getAmsterdamScheduleContext } from "@/lib/leads/amsterdamSchedule"
import { runLeadSearch, type LeadSearchResult } from "@/lib/leads/runLeadSearch"
import { sendLeadRunNotification } from "@/lib/leads/sendLeadRunNotification"
import { getLeadAgentSettings } from "@/lib/leads/settings"
import type { LeadAgentRunStatus } from "@/lib/leads/types"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

type Pair = { city: string; category: string; limit: number }

function allocateSearches(cities: string[], categories: string[], totalLimit: number) {
  const allPairs = cities.flatMap((city) => categories.map((category) => ({ city, category })))
  const pairs = allPairs.slice(0, Math.min(allPairs.length, totalLimit))
  let remaining = totalLimit

  return pairs.map((pair, index): Pair => {
    const limit = Math.ceil(remaining / (pairs.length - index))
    remaining -= limit
    return { ...pair, limit }
  })
}

async function runPairs(supabase: SupabaseClient, pairs: Pair[]) {
  const totals: LeadSearchResult = { found: 0, saved: 0, created: 0, updated: 0, failed: 0 }
  let pairErrors = 0

  for (let index = 0; index < pairs.length; index += 3) {
    const batch = await Promise.allSettled(
      pairs.slice(index, index + 3).map((pair) => runLeadSearch({ supabase, ...pair })),
    )
    for (const result of batch) {
      if (result.status === "rejected") {
        pairErrors += 1
        continue
      }
      totals.found += result.value.found
      totals.saved += result.value.saved
      totals.created += result.value.created
      totals.updated += result.value.updated
      totals.failed += result.value.failed
    }
  }

  totals.failed += pairErrors
  return { totals, pairErrors }
}

async function notifyAndMark(supabase: SupabaseClient, input: {
  runId: string
  weekKey: string
  status: LeadAgentRunStatus
  result: LeadSearchResult
  errorMessage?: string | null
  emailEnabled: boolean
}) {
  const notification = input.emailEnabled
    ? await sendLeadRunNotification({
        status: input.status,
        found: input.result.found,
        created: input.result.created,
        updated: input.result.updated,
        failed: input.result.failed,
        weekKey: input.weekKey,
        errorMessage: input.errorMessage,
      })
    : { sent: false }

  await supabase
    .from("lead_agent_runs")
    .update({ notification_sent: notification.sent })
    .eq("id", input.runId)
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "Lead-agent server configuration is incomplete." }, { status: 503 })
  }

  const schedule = getAmsterdamScheduleContext()
  if (!schedule.isMondayAtNine) {
    return NextResponse.json({ skipped: true, reason: "outside_amsterdam_schedule" })
  }

  const supabase = await createAdminClient()
  const settings = await getLeadAgentSettings(supabase)
  if (!settings.enabled) return NextResponse.json({ skipped: true, reason: "automation_disabled" })

  const { count: existingThisWeek, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", schedule.weekStartedAt)
  if (countError) return NextResponse.json({ error: "Weekly lead count failed." }, { status: 500 })

  const remaining = Math.max(0, settings.weekly_limit - (existingThisWeek ?? 0))
  const runKey = `cron:${schedule.weekKey}`
  const { data: run, error: insertError } = await supabase
    .from("lead_agent_runs")
    .insert({ run_key: runKey, trigger: "cron", status: "running", requested_limit: remaining })
    .select("id")
    .maybeSingle()

  if (insertError?.code === "23505") return NextResponse.json({ skipped: true, reason: "already_run_this_week" })
  if (insertError || !run) return NextResponse.json({ error: "Lead run could not be started." }, { status: 500 })

  const emptyResult: LeadSearchResult = { found: 0, saved: 0, created: 0, updated: 0, failed: 0 }
  if (remaining === 0) {
    await supabase.from("lead_agent_runs").update({ status: "skipped", completed_at: new Date().toISOString() }).eq("id", run.id)
    await notifyAndMark(supabase, { runId: run.id, weekKey: schedule.weekKey, status: "skipped", result: emptyResult, errorMessage: "De wekelijkse limiet was al bereikt.", emailEnabled: settings.email_notifications_enabled })
    return NextResponse.json({ skipped: true, reason: "weekly_limit_reached" })
  }

  try {
    const pairs = allocateSearches(settings.cities, settings.categories, remaining)
    const { totals, pairErrors } = await runPairs(supabase, pairs)
    const status: LeadAgentRunStatus = pairErrors === pairs.length
      ? "failed"
      : totals.failed > 0
        ? "partial"
        : "succeeded"
    const errorMessage = status === "failed" ? "Geen van de ingestelde zoekopdrachten kon worden uitgevoerd." : null

    await supabase.from("lead_agent_runs").update({
      status,
      found_count: totals.found,
      created_count: totals.created,
      updated_count: totals.updated,
      failed_count: totals.failed,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id)
    await notifyAndMark(supabase, { runId: run.id, weekKey: schedule.weekKey, status, result: totals, errorMessage, emailEnabled: settings.email_notifications_enabled })

    return NextResponse.json({ success: status !== "failed", status, ...totals })
  } catch {
    const errorMessage = "De geplande lead-run is onverwacht gestopt."
    await supabase.from("lead_agent_runs").update({ status: "failed", error_message: errorMessage, failed_count: 1, completed_at: new Date().toISOString() }).eq("id", run.id)
    await notifyAndMark(supabase, { runId: run.id, weekKey: schedule.weekKey, status: "failed", result: { ...emptyResult, failed: 1 }, errorMessage, emailEnabled: settings.email_notifications_enabled })
    console.error("[lead-cron] Scheduled lead run failed")
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
