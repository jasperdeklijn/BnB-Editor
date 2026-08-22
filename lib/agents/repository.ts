import "server-only"

import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AgentSettings = {
  agents_enabled: boolean
  observe_only: boolean
  support_enabled: boolean
  marketing_enabled: boolean
  daily_budget_eur: number
  budget_reservation_eur: number
  daily_run_limit: number
  max_jobs_per_dispatch: number
  support_model: string
  marketing_model: string
  model_allowlist: string[]
}

export type AgentJob = {
  id: string
  business_id: string | null
  job_type: string
  payload: unknown
  status: string
  source: string
  deduplication_key: string
  attempt_count: number
  max_attempts: number
  correlation_id: string
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export function artifactContentHash(content: unknown) {
  return createHash("sha256").update(canonicalJson(content)).digest("hex")
}

export async function getAgentSettings(supabase: SupabaseClient): Promise<AgentSettings> {
  const { data, error } = await supabase.from("agent_settings").select("*").eq("singleton_key", true).single()
  if (error || !data) throw new Error("Agentinstellingen konden niet worden geladen.")
  return {
    ...data,
    daily_budget_eur: Number(data.daily_budget_eur),
    budget_reservation_eur: Number(data.budget_reservation_eur),
  } as AgentSettings
}

export async function assertAgentAdminRateLimit(supabase: SupabaseClient, userId: string, limit = 30) {
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await supabase.from("agent_audit_logs").select("id", { count: "exact", head: true }).eq("actor_type", "admin").eq("actor_id", userId).gte("created_at", since)
  if (error) throw new Error("Actielimiet kon niet worden gecontroleerd.")
  if ((count ?? 0) >= limit) throw new Error("Te veel agentacties. Wacht een minuut en probeer opnieuw.")
}

export async function enqueueAgentJob(supabase: SupabaseClient, input: {
  jobType: string
  source: string
  deduplicationKey: string
  scope?: "platform" | "business"
  businessId?: string | null
  payload: Record<string, unknown>
  priority?: number
  riskLevel?: "low" | "medium" | "high" | "critical"
  scheduledFor?: string
  maxAttempts?: number
}) {
  const { data, error } = await supabase.rpc("enqueue_agent_job", {
    p_job_type: input.jobType,
    p_source: input.source,
    p_deduplication_key: input.deduplicationKey,
    p_scope: input.scope ?? "platform",
    p_business_id: input.businessId ?? null,
    p_payload: input.payload,
    p_payload_version: 1,
    p_priority: input.priority ?? 50,
    p_risk_level: input.riskLevel ?? "low",
    p_scheduled_for: input.scheduledFor ?? new Date().toISOString(),
    p_max_attempts: input.maxAttempts ?? 3,
  })
  if (error) throw new Error(`Agenttaak kon niet worden ingepland: ${error.message}`)
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.job_id) throw new Error("Agenttaak gaf geen taak-id terug.")
  return { jobId: String(row.job_id), created: Boolean(row.created) }
}

export async function transitionAgentJob(supabase: SupabaseClient, input: {
  jobId: string
  newStatus: string
  actorType: string
  actorId?: string | null
  workerId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}) {
  const { data, error } = await supabase.rpc("transition_agent_job", {
    p_job_id: input.jobId,
    p_new_status: input.newStatus,
    p_actor_type: input.actorType,
    p_actor_id: input.actorId ?? null,
    p_worker_id: input.workerId ?? null,
    p_error_code: input.errorCode ?? null,
    p_error_message: input.errorMessage ?? null,
    p_metadata: input.metadata ?? {},
  })
  if (error) throw new Error(`Agenttaak kon niet worden bijgewerkt: ${error.message}`)
  return data as AgentJob
}

export function safeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Onbekende fout."
  return error.message
    .replace(/[\r\n]+/g, " ")
    .replace(/\b(?:sk|key)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/(api[_ -]?key|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, 500)
}
