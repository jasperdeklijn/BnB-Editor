import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { sendReply } from "@/lib/mail/send-reply"
import { safeErrorMessage } from "@/lib/agents/repository"
import { supportArtifactContentSchema } from "@/lib/agents/schemas"

async function completeExecution(supabase: SupabaseClient, input: {
  executionId: string
  status: "succeeded" | "failed" | "unknown"
  providerActionId?: string | null
  resultSummary?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}) {
  const { error } = await supabase.rpc("complete_agent_execution", {
    p_execution_id: input.executionId,
    p_status: input.status,
    p_provider_action_id: input.providerActionId ?? null,
    p_result_summary: input.resultSummary ?? null,
    p_error_code: input.errorCode ?? null,
    p_error_message: input.errorMessage ?? null,
  })
  if (error) throw new Error(`Uitvoering kon niet worden afgerond: ${error.message}`)
}

export async function executeAgentExecution(supabase: SupabaseClient, executionId: string) {
  const { data: execution, error: claimError } = await supabase.rpc("claim_agent_execution", { p_execution_id: executionId })
  if (claimError || !execution) throw new Error(claimError?.message || "Uitvoering kon niet worden geclaimd.")

  try {
    const { data: artifact, error } = await supabase.from("agent_artifacts").select("id, content").eq("id", execution.artifact_id).single()
    if (error || !artifact) throw new Error("Goedgekeurd artefact bestaat niet meer.")
    if (execution.executor_type !== "support.send_reply") throw new Error("Onbekend uitvoeringstype.")

    const content = supportArtifactContentSchema.parse(artifact.content)
    const { data: approval } = await supabase.from("agent_approvals").select("decided_by").eq("id", execution.approval_id).single()
    if (!approval?.decided_by) throw new Error("Goedkeurende beheerder ontbreekt.")

    const result = await sendReply(supabase, {
      draftId: content.mailDraftId,
      subject: content.subject,
      body: content.body,
      userId: approval.decided_by,
    })
    await completeExecution(supabase, {
      executionId,
      status: "succeeded",
      providerActionId: result.messageId ?? null,
      resultSummary: "Supportmail is verzonden en geregistreerd.",
    })
    return { executionId, status: "succeeded" as const }
  } catch (error) {
    const message = safeErrorMessage(error)
    const { data: executionRow } = await supabase.from("agent_executions").select("artifact_id").eq("id", executionId).single()
    const { data: artifact } = executionRow
      ? await supabase.from("agent_artifacts").select("content").eq("id", executionRow.artifact_id).single()
      : { data: null }
    const parsed = supportArtifactContentSchema.safeParse(artifact?.content)
    const { data: draft } = parsed.success
      ? await supabase.from("mail_drafts").select("status, outbound_message_id").eq("id", parsed.data.mailDraftId).single()
      : { data: null }
    const status = draft?.status === "sent" ? "unknown" : "failed"
    await completeExecution(supabase, {
      executionId,
      status,
      providerActionId: draft?.outbound_message_id ?? null,
      resultSummary: status === "unknown" ? "SMTP kan voltooid zijn; lokale toestand vereist reconciliatie." : null,
      errorCode: status === "unknown" ? "delivery_uncertain" : "execution_failed",
      errorMessage: message,
    })
    return { executionId, status }
  }
}

export async function processPendingAgentExecutions(supabase: SupabaseClient, limit = 2) {
  const { data, error } = await supabase.from("agent_executions").select("id").eq("status", "pending").order("created_at").limit(limit)
  if (error) throw error
  const results = []
  for (const row of data ?? []) results.push(await executeAgentExecution(supabase, row.id))
  return results
}

export async function reconcileAgentExecutions(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("agent_executions").select("id, artifact_id").eq("status", "unknown").order("created_at").limit(20)
  if (error) throw error
  let reconciled = 0
  for (const execution of data ?? []) {
    const { data: artifact } = await supabase.from("agent_artifacts").select("content").eq("id", execution.artifact_id).single()
    const parsed = supportArtifactContentSchema.safeParse(artifact?.content)
    if (!parsed.success) continue
    const { data: draft } = await supabase.from("mail_drafts").select("status, outbound_message_id").eq("id", parsed.data.mailDraftId).single()
    if (draft?.status !== "sent") continue
    await completeExecution(supabase, {
      executionId: execution.id,
      status: "succeeded",
      providerActionId: draft.outbound_message_id,
      resultSummary: "Verzending is door lokale mailboxregistratie bevestigd.",
    })
    reconciled += 1
  }
  return reconciled
}
