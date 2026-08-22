import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { AgentTeamDashboard } from "@/components/admin/agent-team-dashboard"
import { SharedHeader } from "@/components/layout/shared-header"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "AI-agentteam | Beheer", description: "Taken, goedkeuringen, runs en begrenzingen van het AI-agentteam." }

export default async function AdminAgentsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return <main className="min-h-screen bg-[var(--hero-bg)] text-white"><SharedHeader title="AI-agentteam" /><p className="mx-auto max-w-7xl px-4 py-10">Serverconfiguratie ontbreekt.</p></main>

  const admin = await createAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString()
  const [{ data: settings }, { data: approvalRows }, { data: jobs }, { data: runs }] = await Promise.all([
    admin.from("agent_settings").select("*").eq("singleton_key", true).single(),
    admin.from("agent_approvals").select("*").order("requested_at", { ascending: false }).limit(100),
    admin.from("agent_jobs").select("id, job_type, status, attempt_count, max_attempts, created_at, last_error_message").order("created_at", { ascending: false }).limit(100),
    admin.from("agent_runs").select("id, agent_type, status, total_tokens, estimated_cost, created_at").gte("created_at", since).order("created_at", { ascending: false }),
  ])
  if (!settings) return <main className="min-h-screen bg-[var(--hero-bg)] text-white"><SharedHeader title="AI-agentteam" /><p className="mx-auto max-w-7xl px-4 py-10">Voer eerst de agentmigratie uit.</p></main>
  const artifactIds = (approvalRows ?? []).map((row) => row.artifact_id)
  const { data: artifacts } = artifactIds.length ? await admin.from("agent_artifacts").select("id, title, content, version").in("id", artifactIds) : { data: [] }
  const artifactMap = new Map((artifacts ?? []).map((artifact) => [artifact.id, artifact]))
  const approvals = (approvalRows ?? []).map((approval) => ({ ...approval, artifact: artifactMap.get(approval.artifact_id) ?? null }))

  return <main className="min-h-screen bg-[var(--hero-bg)] text-white"><SharedHeader title="AI-agentteam" /><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Alleen beheerders</p><h1 className="mt-2 text-3xl font-bold">Agent control center</h1><p className="mt-2 max-w-2xl text-sm text-white/60">Centrale wachtrij, menselijke goedkeuring, uitvoering en herstel zonder verborgen autonome acties.</p></div><nav className="flex flex-wrap gap-4 text-sm font-medium"><Link href="#approvals" className="text-[var(--brand-blue)] hover:text-white">Goedkeuringen</Link><Link href="#history" className="text-[var(--brand-blue)] hover:text-white">Historie</Link><Link href="#settings" className="text-[var(--brand-blue)] hover:text-white">Instellingen</Link><Link href="/admin" className="text-[var(--brand-blue)] hover:text-white">Admin</Link></nav></div><AgentTeamDashboard initialSettings={settings} approvals={approvals} jobs={jobs ?? []} runs={runs ?? []} /></div></main>
}
