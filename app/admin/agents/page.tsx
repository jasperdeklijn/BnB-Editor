import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { AgentTeamDashboard } from "@/components/admin/agent-team-dashboard"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/admin/model"

export const metadata = { title: "AI-agentteam | Beheer", description: "Taken, goedkeuringen, runs en begrenzingen van het AI-agentteam." }

export default async function AdminAgentsPage({ searchParams }: { searchParams: Promise<{ job?: string; approval?: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()
  const params = await searchParams
  const jobId = params.job && isUuid(params.job) ? params.job : undefined
  const approvalId = params.approval && isUuid(params.approval) ? params.approval : undefined
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return <main className="min-h-full bg-muted text-foreground"><p className="mx-auto max-w-7xl px-4 py-10">Serverconfiguratie ontbreekt.</p></main>

  const admin = await createAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString()
  const [settingsResult, approvalsResult, jobsResult, runsResult, selectedJobResult, selectedApprovalResult] = await Promise.all([
    admin.from("agent_settings").select("*").eq("singleton_key", true).single(),
    admin.from("agent_approvals").select("*").order("requested_at", { ascending: false }).limit(100),
    admin.from("agent_jobs").select("id, job_type, status, attempt_count, max_attempts, created_at, last_error_message").order("created_at", { ascending: false }).limit(100),
    admin.from("agent_runs").select("id, agent_type, status, total_tokens, estimated_cost, created_at").gte("created_at", since).order("created_at", { ascending: false }),
    jobId ? admin.from("agent_jobs").select("id,job_type,status,attempt_count,max_attempts,created_at,last_error_message").eq("id", jobId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    approvalId ? admin.from("agent_approvals").select("*").eq("id", approvalId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  const settings = settingsResult.data
  if (!settings) return <main className="min-h-full bg-muted text-foreground"><p className="mx-auto max-w-7xl px-4 py-10">Voer eerst de agentmigratie uit.</p></main>
  const approvalRows = approvalsResult.data ?? []
  if (selectedApprovalResult.data && !approvalRows.some((row) => row.id === approvalId)) approvalRows.push(selectedApprovalResult.data)
  const jobs = jobsResult.data ?? []
  if (selectedJobResult.data && !jobs.some((job) => job.id === jobId)) jobs.push(selectedJobResult.data)
  jobs.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const artifactIds = approvalRows.map((row) => row.artifact_id)
  const { data: artifacts, error: artifactsError } = artifactIds.length ? await admin.from("agent_artifacts").select("id, title, content, version").in("id", artifactIds) : { data: [], error: null }
  const artifactMap = new Map((artifacts ?? []).map((artifact) => [artifact.id, artifact]))
  const approvals = (approvalRows ?? []).map((approval) => ({ ...approval, artifact: artifactMap.get(approval.artifact_id) ?? null }))

  const loadError = [approvalsResult, jobsResult, runsResult, selectedJobResult, selectedApprovalResult].some((result) => result.error) || artifactsError
  const missingSelection = (jobId && !selectedJobResult.data) || (approvalId && !selectedApprovalResult.data)
  return <main className="min-h-full bg-muted text-foreground"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Alleen beheerders</p><h1 className="mt-2 text-3xl font-bold">Agent control center</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Centrale wachtrij, menselijke goedkeuring, uitvoering en herstel zonder verborgen autonome acties.</p></div><nav className="flex flex-wrap gap-4 text-sm font-medium"><Link href="#approvals" className="text-primary hover:text-foreground">Goedkeuringen</Link><Link href="#history" className="text-primary hover:text-foreground">Historie</Link><Link href="#settings" className="text-primary hover:text-foreground">Instellingen</Link><Link href="/admin" className="text-primary hover:text-foreground">Admin</Link></nav></div>{loadError ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">Een deel van de agentgegevens kon niet worden geladen. Vernieuw de pagina voordat je verdergaat.</p> : null}{missingSelection ? <p role="alert" className="mb-4 text-sm text-muted-foreground">De geselecteerde taak of goedkeuring is niet meer beschikbaar.</p> : null}<AgentTeamDashboard initialSettings={settings} approvals={approvals} jobs={jobs} runs={runsResult.data ?? []} /></div></main>
}
