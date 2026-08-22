import { NextResponse } from "next/server"
import { reconcileAgentExecutions } from "@/lib/agents/executor"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Agent server configuration is incomplete." }, { status: 503 })
  const supabase = await createAdminClient()
  const [{ data: leaseData, error: leaseError }, { data: expired, error: approvalError }, { data: cleanup, error: cleanupError }, reconciled] = await Promise.all([
    supabase.rpc("requeue_expired_agent_jobs"),
    supabase.rpc("expire_agent_approvals"),
    supabase.rpc("cleanup_agent_history"),
    reconcileAgentExecutions(supabase),
  ])
  if (leaseError || approvalError || cleanupError) return NextResponse.json({ error: "Agentreconciliatie is mislukt." }, { status: 500 })
  return NextResponse.json({ leases: leaseData, expiredApprovals: expired, cleanup, reconciledExecutions: reconciled })
}
