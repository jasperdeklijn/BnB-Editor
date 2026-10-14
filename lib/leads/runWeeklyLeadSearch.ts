import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { runLeadSearch, type LeadSearchResult } from "@/lib/leads/runLeadSearch"
import { sendLeadRunNotification } from "@/lib/leads/sendLeadRunNotification"

type WeeklySearch = {
  weekKey: string
  cities: string[]
  categories: string[]
  limit: number
  emailNotificationsEnabled: boolean
}

export async function runWeeklyLeadSearch(supabase: SupabaseClient, input: WeeklySearch) {
  // The unique run key also prevents concurrent cron invocations from running twice.
  const { data: run, error } = await supabase.from("lead_agent_runs").insert({
    run_key: `lead-cron:${input.weekKey}`,
    trigger: "cron",
    status: "running",
    requested_limit: input.limit,
  }).select("id").single()
  if (error?.code === "23505") return { skipped: true, reason: "run_already_processed" }
  if (error || !run) throw new Error("Lead-run kon niet worden gestart.")

  const totals: LeadSearchResult = { found: 0, saved: 0, created: 0, updated: 0, failed: 0 }
  const pairs = input.cities.flatMap((city) => input.categories.map((category) => ({ city, category })))
    .slice(0, input.limit)
  let remaining = input.limit
  for (const [index, pair] of pairs.entries()) {
    const limit = Math.ceil(remaining / (pairs.length - index))
    remaining -= limit
    try {
      const result = await runLeadSearch({ supabase, ...pair, limit })
      for (const key of Object.keys(totals) as Array<keyof LeadSearchResult>) totals[key] += result[key]
    } catch {
      totals.failed += 1
    }
  }
  const status = totals.saved === 0 && totals.failed > 0 ? "failed" : totals.failed > 0 ? "partial" : "succeeded"
  const errorMessage = status === "failed" ? "Geen zoekopdracht kon worden afgerond." : null
  // Save the result before SMTP so a notification failure cannot lose the run history.
  const { error: updateError } = await supabase.from("lead_agent_runs").update({
    status,
    found_count: totals.found,
    created_count: totals.created,
    updated_count: totals.updated,
    failed_count: totals.failed,
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  }).eq("id", run.id)
  if (updateError) throw new Error("Lead-run kon niet worden afgerond.")

  if (input.emailNotificationsEnabled) {
    const notification = await sendLeadRunNotification({ status, ...totals, weekKey: input.weekKey, errorMessage })
    const { error: notificationError } = await supabase.from("lead_agent_runs").update({ notification_sent: notification.sent }).eq("id", run.id)
    if (notificationError) throw new Error("Notificatiestatus kon niet worden opgeslagen.")
  }
  return { skipped: false, status, ...totals }
}
