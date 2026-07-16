import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { LeadAgentSettingsForm } from "@/components/admin/lead-agent-settings-form"
import { SharedHeader } from "@/components/layout/shared-header"
import { getLeadAgentSettings } from "@/lib/leads/settings"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Lead-agent instellingen | Beheer",
  description: "Beheer de wekelijkse automatische leadzoekopdracht.",
}

export default async function LeadAgentSettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <main className="min-h-screen bg-[var(--hero-bg)] text-white"><SharedHeader title="Lead-agent instellingen" /><div className="mx-auto max-w-4xl px-6 py-12">Serverconfiguratie ontbreekt.</div></main>
  }

  const admin = await createAdminClient()
  let settings
  try {
    settings = await getLeadAgentSettings(admin)
  } catch {
    return <main className="min-h-screen bg-[var(--hero-bg)] text-white"><SharedHeader title="Lead-agent instellingen" /><div className="mx-auto max-w-4xl px-6 py-12">Instellingen zijn niet beschikbaar. Voer eerst de lead-agent automatiseringsmigratie uit.</div></main>
  }

  const configuration = [
    { label: "CRON_SECRET", ready: Boolean(process.env.CRON_SECRET?.trim()) },
    { label: "Google Places", ready: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()) },
    { label: "SMTP", ready: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) },
    { label: "ADMIN_EMAILS", ready: Boolean(process.env.ADMIN_EMAILS?.trim()) },
  ]

  return (
    <main className="min-h-screen bg-[var(--hero-bg)] text-white">
      <SharedHeader title="Lead-agent instellingen" />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Automatisering</p>
            <h1 className="mt-2 text-3xl font-bold">Wekelijkse lead-agent</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">Configureer regio’s, branches, de weeklimiet en beheerdersnotificaties.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/admin" className="text-[var(--brand-blue)] hover:text-white">Adminoverzicht</Link>
            <Link href="/admin/leads" className="text-[var(--brand-blue)] hover:text-white">Terug naar leads</Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {configuration.map((item) => (
            <div key={item.label} className={`rounded-xl border p-3 text-sm ${item.ready ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-yellow-300/25 bg-yellow-300/10 text-yellow-100"}`}>
              <span className="font-medium">{item.label}</span><span className="ml-2">{item.ready ? "gereed" : "ontbreekt"}</span>
            </div>
          ))}
        </div>

        <LeadAgentSettingsForm initialSettings={settings} />
      </div>
    </main>
  )
}
