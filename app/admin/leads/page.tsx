import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { LeadsDashboard } from "@/components/admin/leads-dashboard"
import { SharedHeader } from "@/components/layout/shared-header"
import type { LeadAgentRun, LeadAgentSettings, LeadRecord } from "@/lib/leads/types"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "AI leads | Beheer",
  description: "Zoek, analyseer en beheer zakelijke leads.",
}

export default async function AdminLeadsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()

  let leads: LeadRecord[] = []
  let settings: LeadAgentSettings | null = null
  let runs: LeadAgentRun[] = []
  let loadError = ""

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    loadError = "De server-side Supabase-configuratie ontbreekt. Leads kunnen niet worden geladen of opgeslagen."
  } else {
    const admin = await createAdminClient()
    const [{ data, error }, { data: settingsData }, { data: runData }] = await Promise.all([
      admin.from("leads").select("*").order("lead_score", { ascending: false }).order("created_at", { ascending: false }).limit(500),
      admin.from("lead_agent_settings").select("*").eq("singleton_key", true).maybeSingle(),
      admin.from("lead_agent_runs").select("*").order("started_at", { ascending: false }).limit(5),
    ])

    if (error) loadError = "De leads konden niet worden geladen. Controleer of de leads-migratie is uitgevoerd."
    else leads = (data ?? []) as LeadRecord[]
    settings = settingsData as LeadAgentSettings | null
    runs = (runData ?? []) as LeadAgentRun[]
  }

  return (
    <main className="min-h-screen bg-[var(--hero-bg)] text-white">
      <SharedHeader title="AI leads" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold">Lead-agent</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">Vind lokale bedrijven, beoordeel hun online presentatie en bereid outreach voor handmatige controle voor.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/admin/leads/settings" className="text-[var(--brand-blue)] hover:text-white">Automatisering</Link>
            <Link href="/editor" className="text-[var(--brand-blue)] hover:text-white">Terug naar editor</Link>
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-5 text-red-100">{loadError}</div>
        ) : (
          <>
            <AutomationSummary settings={settings} runs={runs} />
            <LeadsDashboard initialLeads={leads} />
          </>
        )}
      </div>
    </main>
  )
}

function AutomationSummary({ settings, runs }: { settings: LeadAgentSettings | null; runs: LeadAgentRun[] }) {
  const latest = runs[0]
  const statusLabels = { running: "Bezig", succeeded: "Voltooid", partial: "Deels voltooid", failed: "Mislukt", skipped: "Overgeslagen" }

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Wekelijkse automatisering: {settings?.enabled ? "actief" : "uitgeschakeld"}</p>
          <p className="mt-1 text-sm text-white/55">Maandag 09:00 uur · maximaal {settings?.weekly_limit ?? 25} nieuwe leads per week</p>
        </div>
        <Link href="/admin/leads/settings" className="text-sm font-medium text-[var(--brand-blue)] hover:text-white">Instellingen beheren</Link>
      </div>
      {latest ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-black/10 p-4 text-sm sm:grid-cols-5">
          <div><span className="block text-white/40">Laatste run</span>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(latest.started_at))}</div>
          <div><span className="block text-white/40">Status</span>{statusLabels[latest.status]}</div>
          <div><span className="block text-white/40">Nieuw</span>{latest.created_count}</div>
          <div><span className="block text-white/40">Bijgewerkt</span>{latest.updated_count}</div>
          <div><span className="block text-white/40">E-mail</span>{latest.notification_sent ? "Verzonden" : "Niet verzonden"}</div>
          {latest.error_message && <p className="text-red-100 sm:col-span-5">{latest.error_message}</p>}
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/45">Er is nog geen geplande run uitgevoerd.</p>
      )}
    </section>
  )
}
