import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowRight,
  Bot,
  ClipboardList,
  CreditCard,
  Eye,
  FileClock,
  Globe2,
  LayoutTemplate,
  Mail,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"
import { getAllTemplatePresets } from "@/components/templates/category-presets"
import { SharedHeader } from "@/components/layout/shared-header"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Adminoverzicht | Beheer",
  description: "Statistieken en beheerpagina's van het platform.",
}

type Stat = {
  label: string
  value: number | null
  description: string
  icon: typeof Users
}

type AuditLog = {
  id: string
  action: string
  created_at: string
}

type TemplateUsage = {
  id: string
  name: string
  count: number
}

const templateNames = new Map(getAllTemplatePresets().map((template) => [template.id, template.name]))

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(value))
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()

  let stats: Stat[] = [
    { label: "Bezoekers", value: null, description: "Bezoekerssessies in de laatste 30 dagen", icon: Eye },
    { label: "Accounts aangemaakt", value: null, description: "Alle geregistreerde accounts", icon: UserPlus },
    { label: "Websites gepubliceerd", value: null, description: "Websites die momenteel live staan", icon: Globe2 },
    { label: "Betalende klanten", value: null, description: "Actieve betaalde abonnementen", icon: CreditCard },
    { label: "Opzeggingen", value: null, description: "Abonnementen met status opgezegd", icon: UserMinus },
    { label: "Aanvragen", value: null, description: "Ontvangen contactaanvragen", icon: ClipboardList },
    { label: "Leads", value: null, description: "Leads in de database", icon: Bot },
    { label: "Nieuwe mails", value: null, description: "Ongelezen supportgesprekken", icon: Mail },
  ]
  let recentLogs: AuditLog[] = []
  let topTemplates: TemplateUsage[] = []
  let loadError = ""

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    loadError = "SUPABASE_SERVICE_ROLE_KEY ontbreekt. Statistieken kunnen niet veilig worden geladen."
  } else {
    const admin = await createAdminClient()
    const visitorCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [
      usersResult,
      visitorsResult,
      publishedResult,
      payingCustomersResult,
      cancellationsResult,
      requestsResult,
      leadsResult,
      unreadMailResult,
      templatesResult,
      logsResult,
    ] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      admin.from("website_visits").select("*", { count: "exact", head: true }).gte("visited_at", visitorCutoff),
      admin.from("websites").select("*", { count: "exact", head: true }).eq("published", true),
      admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "canceled"),
      admin.from("contact_requests").select("*", { count: "exact", head: true }),
      admin.from("leads").select("*", { count: "exact", head: true }),
      admin.from("mail_threads").select("*", { count: "exact", head: true }).gt("unread_count", 0),
      admin.from("websites").select("applied_template_id").not("applied_template_id", "is", null),
      admin.from("audit_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(5),
    ])

    const countResults = [
      visitorsResult,
      publishedResult,
      payingCustomersResult,
      cancellationsResult,
      requestsResult,
      leadsResult,
      unreadMailResult,
    ]
    const hasCountError = countResults.some((result) => result.error)

    stats = [
      { ...stats[0], value: visitorsResult.error ? null : visitorsResult.count ?? 0 },
      { ...stats[1], value: usersResult.error ? null : usersResult.data.total },
      { ...stats[2], value: publishedResult.error ? null : publishedResult.count ?? 0 },
      { ...stats[3], value: payingCustomersResult.error ? null : payingCustomersResult.count ?? 0 },
      { ...stats[4], value: cancellationsResult.error ? null : cancellationsResult.count ?? 0 },
      { ...stats[5], value: requestsResult.error ? null : requestsResult.count ?? 0 },
      { ...stats[6], value: leadsResult.error ? null : leadsResult.count ?? 0 },
      { ...stats[7], value: unreadMailResult.error ? null : unreadMailResult.count ?? 0 },
    ]
    if (!templatesResult.error) {
      const counts = new Map<string, number>()
      for (const website of templatesResult.data ?? []) {
        if (website.applied_template_id) {
          counts.set(website.applied_template_id, (counts.get(website.applied_template_id) ?? 0) + 1)
        }
      }
      topTemplates = [...counts.entries()]
        .map(([id, count]) => ({ id, count, name: templateNames.get(id) ?? id }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "nl"))
        .slice(0, 5)
    }
    recentLogs = logsResult.error ? [] : ((logsResult.data ?? []) as AuditLog[])

    if (usersResult.error || hasCountError || templatesResult.error || logsResult.error) {
      loadError = "Een deel van de beheerstatistieken kon niet worden geladen. Controleer de database-migraties en serverconfiguratie."
    }
  }

  return (
    <main className="min-h-screen bg-[var(--hero-bg)] text-white">
      <SharedHeader title="Admin" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Adminoverzicht</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Bekijk de belangrijkste platformcijfers en ga direct naar een beheeronderdeel.
            </p>
          </div>
          <Link href="/editor" className="text-sm font-medium text-[var(--brand-blue)] transition-colors hover:text-white">
            Naar de editor
          </Link>
        </div>

        {loadError && (
          <div role="alert" className="mb-8 rounded-xl border border-yellow-300/25 bg-yellow-300/10 p-4 text-sm text-yellow-100">
            {loadError}
          </div>
        )}

        <section aria-labelledby="statistics-heading">
          <h2 id="statistics-heading" className="sr-only">Platformstatistieken</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <article key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white/60">{stat.label}</p>
                      <p className="mt-2 text-3xl font-bold">{stat.value === null ? "—" : stat.value.toLocaleString("nl-NL")}</p>
                      <p className="mt-1 text-xs text-white/45">{stat.description}</p>
                    </div>
                    <span className="rounded-xl border border-[var(--brand-blue)]/20 bg-[var(--brand-blue)]/10 p-3 text-[var(--brand-blue)]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="templates-heading" className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--brand-blue)]/10 p-3 text-[var(--brand-blue)]">
              <LayoutTemplate className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="templates-heading" className="text-lg font-semibold">Meest gebruikte templates</h2>
              <p className="mt-1 text-xs text-white/45">Gebaseerd op het laatst toegepaste template per website</p>
            </div>
          </div>

          {topTemplates.length ? (
            <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {topTemplates.map((template, index) => (
                <li key={template.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                  <span className="text-xs font-semibold text-[var(--brand-blue)]">#{index + 1}</span>
                  <p className="mt-1 text-sm font-medium">{template.name}</p>
                  <p className="mt-2 text-xs text-white/45">{template.count.toLocaleString("nl-NL")} {template.count === 1 ? "website" : "websites"}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/50">
              Nog geen templategebruik gemeten.
            </p>
          )}
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section aria-labelledby="admin-pages-heading">
            <div className="mb-4">
              <h2 id="admin-pages-heading" className="text-2xl font-semibold">Beheerpagina's</h2>
              <p className="mt-1 text-sm text-white/55">Kies het onderdeel dat je wilt beheren.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminLink
                href="/admin/websites"
                icon={Globe2}
                title="Gepubliceerde websites"
                description="Bekijk live websites, eigenaren en gekoppelde domeinnamen."
              />
              <AdminLink
                href="/admin/mailbox"
                icon={Mail}
                title="AI mailbox"
                description="Bekijk nieuwe supportmail en controleer antwoordvoorstellen."
              />
              <AdminLink
                href="/admin/leads"
                icon={Bot}
                title="AI leads"
                description="Zoek, beoordeel en beheer potentiële klanten."
              />
              <AdminLink
                href="/admin/leads/settings"
                icon={FileClock}
                title="Lead-automatisering"
                description="Beheer de planning, regio's en notificaties."
              />
              <AdminLink
                href="/admin/agents"
                icon={Bot}
                title="AI-agentteam"
                description="Beheer taken, goedkeuringen, uitvoering en veiligheidslimieten."
              />
              <AdminLink
                href="/admin/audit-logs"
                icon={ClipboardList}
                title="Auditlogs"
                description="Bekijk recente beveiligings- en platformacties."
              />
            </div>
          </section>

          <section aria-labelledby="activity-heading" className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="activity-heading" className="text-lg font-semibold">Recente activiteit</h2>
                <p className="mt-1 text-xs text-white/45">Laatste auditacties</p>
              </div>
              <Link href="/admin/audit-logs" className="text-xs font-medium text-[var(--brand-blue)] hover:text-white">
                Alles bekijken
              </Link>
            </div>

            {recentLogs.length ? (
              <ul className="mt-5 divide-y divide-white/10">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0 break-words text-sm font-medium">{log.action}</span>
                    <time dateTime={log.created_at} className="shrink-0 text-right text-xs text-white/45">
                      {formatDate(log.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/50">
                Nog geen auditactiviteit beschikbaar.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function AdminLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof Bot
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-[var(--brand-blue)]/40 hover:bg-white/[0.08]"
    >
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-[var(--brand-blue)]/10 p-3 text-[var(--brand-blue)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">{title}</h3>
            <ArrowRight className="size-4 shrink-0 text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand-blue)]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
        </div>
      </div>
    </Link>
  )
}
