import "server-only"

import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { artifactContentHash, getAgentSettings, safeErrorMessage, transitionAgentJob, type AgentJob, type AgentSettings } from "@/lib/agents/repository"
import { dailySummaryJobPayloadSchema, marketingJobPayloadSchema, supportJobPayloadSchema } from "@/lib/agents/schemas"
import { processPendingAgentExecutions } from "@/lib/agents/executor"
import { generateReplyDraft } from "@/lib/mail/generate-reply"
import { runLeadSearch, type LeadSearchResult } from "@/lib/leads/runLeadSearch"
import { sendLeadRunNotification } from "@/lib/leads/sendLeadRunNotification"

type Pair = { city: string; category: string; limit: number }

function allocateSearches(cities: string[], categories: string[], totalLimit: number): Pair[] {
  const candidates = cities.flatMap((city) => categories.map((category) => ({ city, category })))
  const pairs = candidates.slice(0, Math.min(candidates.length, totalLimit))
  let remaining = totalLimit
  return pairs.map((pair, index) => {
    const limit = Math.ceil(remaining / (pairs.length - index))
    remaining -= limit
    return { ...pair, limit }
  })
}

async function startRun(supabase: SupabaseClient, job: AgentJob, input: { agentType: string; model: string; promptVersion: string; inputSummary: string }) {
  const { data, error } = await supabase.from("agent_runs").insert({
    job_id: job.id,
    agent_type: input.agentType,
    provider: "vercel-ai-gateway",
    model: input.model,
    status: "in_progress",
    prompt_version: input.promptVersion,
    input_summary: input.inputSummary.slice(0, 2_000),
  }).select("id").single()
  if (error || !data) throw new Error("Agent-run kon niet worden gestart.")
  return data.id as string
}

async function finishRun(supabase: SupabaseClient, input: {
  runId: string
  jobId: string
  artifactType: string
  title: string
  content: Record<string, unknown>
  summary: string
  providerResponseId?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  actionType?: string | null
  riskLevel?: string
}) {
  const { error } = await supabase.rpc("complete_agent_run_with_artifact", {
    p_run_id: input.runId,
    p_job_id: input.jobId,
    p_artifact_type: input.artifactType,
    p_title: input.title,
    p_content: input.content,
    p_content_hash: artifactContentHash(input.content),
    p_output_summary: input.summary,
    p_provider_response_id: input.providerResponseId ?? null,
    p_input_tokens: input.inputTokens ?? null,
    p_output_tokens: input.outputTokens ?? null,
    p_total_tokens: input.totalTokens ?? null,
    p_action_type: input.actionType ?? null,
    p_risk_level: input.riskLevel ?? "low",
    p_approval_expires_at: input.actionType ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString() : null,
  })
  if (error) throw new Error(`Agent-run kon niet worden afgerond: ${error.message}`)
}

async function processSupportJob(supabase: SupabaseClient, job: AgentJob, settings: AgentSettings) {
  if (!settings.support_enabled) throw new Error("De supportagent is uitgeschakeld.")
  const payload = supportJobPayloadSchema.parse(job.payload)
  const runId = await startRun(supabase, job, {
    agentType: "support",
    model: settings.support_model,
    promptVersion: "mail-reply-v1",
    inputSummary: `Supportconcept voor bericht ${payload.messageId}`,
  })
  const draft = await generateReplyDraft(supabase, { ...payload, model: settings.support_model })
  const { data: sourceMessage } = await supabase.from("mail_messages").select("subject, text_body").eq("id", payload.messageId).single()
  const content = {
    mailDraftId: draft.id,
    threadId: payload.threadId,
    messageId: payload.messageId,
    subject: draft.subject,
    body: draft.suggested_body,
    confidence: draft.confidence,
    confidenceReasons: draft.confidence_reasons ?? [],
    missingInformation: draft.missing_information ?? [],
    sourceExcerpt: sourceMessage ? `${sourceMessage.subject}\n\n${sourceMessage.text_body}`.slice(0, 1_200) : undefined,
    knowledgeAnswerIds: draft.knowledge_answer_ids ?? [],
    exampleMessageIds: draft.example_message_ids ?? [],
  }
  await finishRun(supabase, {
    runId,
    jobId: job.id,
    artifactType: "support_reply",
    title: draft.subject,
    content,
    summary: `Supportconcept met ${draft.confidence ?? "onbekende"} zekerheid gemaakt.`,
    providerResponseId: draft.provider_response_id,
    inputTokens: draft.input_tokens,
    outputTokens: draft.output_tokens,
    totalTokens: draft.total_tokens,
    actionType: "support.send_reply",
    riskLevel: draft.confidence === "low" ? "high" : "medium",
  })
}

async function processMarketingJob(supabase: SupabaseClient, job: AgentJob, settings: AgentSettings) {
  if (!settings.marketing_enabled) throw new Error("De marketingagent is uitgeschakeld.")
  const payload = marketingJobPayloadSchema.parse(job.payload)
  const runId = await startRun(supabase, job, {
    agentType: "marketing",
    model: settings.marketing_model,
    promptVersion: "lead-search-v1",
    inputSummary: `Leadzoektocht ${payload.weekKey}, maximaal ${payload.limit}`,
  })
  const { data: leadRun, error } = await supabase.from("lead_agent_runs").insert({
    run_key: `agent:${job.id}`,
    trigger: "cron",
    status: "running",
    requested_limit: payload.limit,
    agent_job_id: job.id,
  }).select("id").single()
  if (error || !leadRun) throw new Error("Lead-run kon niet worden gestart.")

  const totals: LeadSearchResult = { found: 0, saved: 0, created: 0, updated: 0, failed: 0 }
  const pairs = allocateSearches(payload.cities, payload.categories, payload.limit)
  for (const pair of pairs) {
    try {
      const result = await runLeadSearch({ supabase, ...pair })
      for (const key of Object.keys(totals) as Array<keyof LeadSearchResult>) totals[key] += result[key]
    } catch {
      totals.failed += 1
    }
  }
  const status = totals.saved === 0 && totals.failed > 0 ? "failed" : totals.failed > 0 ? "partial" : "succeeded"
  const errorMessage = status === "failed" ? "Geen zoekopdracht kon worden afgerond." : null
  const notification = payload.emailNotificationsEnabled
    ? await sendLeadRunNotification({ status, found: totals.found, created: totals.created, updated: totals.updated, failed: totals.failed, weekKey: payload.weekKey, errorMessage })
    : { sent: false }
  await supabase.from("lead_agent_runs").update({
    status,
    found_count: totals.found,
    created_count: totals.created,
    updated_count: totals.updated,
    failed_count: totals.failed,
    error_message: errorMessage,
    notification_sent: notification.sent,
    completed_at: new Date().toISOString(),
  }).eq("id", leadRun.id)
  await finishRun(supabase, {
    runId,
    jobId: job.id,
    artifactType: "marketing_report",
    title: `Leadrapport ${payload.weekKey}`,
    content: { leadRunId: leadRun.id, weekKey: payload.weekKey, status, totals, searches: pairs },
    summary: `${totals.saved} leads opgeslagen; ${totals.failed} fouten.`,
  })
}

async function processDailySummaryJob(supabase: SupabaseClient, job: AgentJob) {
  const payload = dailySummaryJobPayloadSchema.parse(job.payload)
  const runId = await startRun(supabase, job, {
    agentType: "daily_summary",
    model: "deterministic",
    promptVersion: "daily-summary-v1",
    inputSummary: `Dagsamenvatting ${payload.localDate}`,
  })
  const start = `${payload.localDate}T00:00:00.000+02:00`
  const { data: jobs, error } = await supabase.from("agent_jobs").select("status, job_type").gte("created_at", start)
  if (error) throw error
  const byStatus = Object.groupBy(jobs ?? [], (row) => row.status)
  const content = {
    localDate: payload.localDate,
    totalJobs: jobs?.length ?? 0,
    completed: byStatus.completed?.length ?? 0,
    awaitingApproval: byStatus.awaiting_approval?.length ?? 0,
    failed: (byStatus.failed?.length ?? 0) + (byStatus.dead_letter?.length ?? 0),
  }
  await finishRun(supabase, {
    runId,
    jobId: job.id,
    artifactType: "daily_summary",
    title: `Agentdagsamenvatting ${payload.localDate}`,
    content,
    summary: `${content.completed} afgerond, ${content.awaitingApproval} wachtend, ${content.failed} mislukt.`,
  })
}

async function handleFailure(supabase: SupabaseClient, job: AgentJob, runId: string | null, workerId: string, error: unknown) {
  const message = safeErrorMessage(error)
  if (runId) {
    await supabase.from("agent_runs").update({ status: "failed", error_code: "job_failed", error_message: message, finished_at: new Date().toISOString() }).eq("id", runId).eq("status", "in_progress")
  } else {
    await supabase.from("agent_runs").update({ status: "failed", error_code: "job_failed", error_message: message, finished_at: new Date().toISOString() }).eq("job_id", job.id).eq("status", "in_progress")
  }
  const retry = job.attempt_count < job.max_attempts
  await transitionAgentJob(supabase, {
    jobId: job.id,
    newStatus: retry ? "queued" : "dead_letter",
    actorType: "worker",
    actorId: workerId,
    workerId,
    errorCode: "job_failed",
    errorMessage: message,
    metadata: { retry },
  })
  return retry ? "retried" : "dead_letter"
}

export async function dispatchAgentJobs(supabase: SupabaseClient) {
  const settings = await getAgentSettings(supabase)
  if (!settings.agents_enabled) return { skipped: true, reason: "agents_disabled", claimed: 0, processed: 0 }

  const today = new Date().toISOString().slice(0, 10)
  const [{ count: runsToday }, { data: runCosts }] = await Promise.all([
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00.000Z`),
    supabase.from("agent_runs").select("estimated_cost").gte("created_at", `${today}T00:00:00.000Z`),
  ])
  if ((runsToday ?? 0) >= settings.daily_run_limit) return { skipped: true, reason: "daily_run_limit", claimed: 0, processed: 0 }
  const reservedCost = (runCosts ?? []).reduce((sum, row) => sum + Number(row.estimated_cost ?? settings.budget_reservation_eur), 0)
  if (reservedCost + settings.budget_reservation_eur > settings.daily_budget_eur) return { skipped: true, reason: "daily_budget", claimed: 0, processed: 0 }

  const executions = await processPendingAgentExecutions(supabase, settings.max_jobs_per_dispatch)
  const workerId = `dispatcher:${randomUUID()}`
  const remainingRuns = Math.max(0, settings.daily_run_limit - (runsToday ?? 0))
  const limit = Math.min(Math.max(0, settings.max_jobs_per_dispatch - executions.length), remainingRuns)
  if (limit === 0) return { skipped: false, claimed: 0, processed: 0, results: [], executions }
  const { data, error } = await supabase.rpc("claim_agent_jobs", { p_worker_id: workerId, p_limit: limit, p_lease_seconds: 300 })
  if (error) throw new Error(`Agenttaken konden niet worden geclaimd: ${error.message}`)
  const jobs = (data ?? []) as AgentJob[]
  const results: Array<{ jobId: string; status: string }> = []
  for (const job of jobs) {
    try {
      await transitionAgentJob(supabase, { jobId: job.id, newStatus: "running", actorType: "worker", actorId: workerId, workerId })
      if (job.job_type === "support.reply") await processSupportJob(supabase, job, settings)
      else if (job.job_type === "marketing.lead_search") await processMarketingJob(supabase, job, settings)
      else if (job.job_type === "platform.daily_summary") await processDailySummaryJob(supabase, job)
      else throw new Error(`Onbekend agenttaaktype: ${job.job_type}`)
      results.push({ jobId: job.id, status: "processed" })
    } catch (processError) {
      results.push({ jobId: job.id, status: await handleFailure(supabase, job, null, workerId, processError) })
    }
  }
  return { skipped: false, claimed: jobs.length, processed: results.length, results, executions }
}
