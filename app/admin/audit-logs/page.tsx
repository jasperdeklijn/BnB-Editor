import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { SharedHeader } from "@/components/layout/shared-header"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/security"

export const metadata = {
  title: "Auditlogs | Beheer",
  description: "Beveiligd overzicht van belangrijke platformacties.",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(value))
}

export default async function AuditLogsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="min-h-screen bg-[var(--hero-bg)] text-white">
        <SharedHeader title="Auditlogs" />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-3xl font-bold">Auditlogs niet beschikbaar</h1>
          <p className="mt-3 text-white/70">De server-side Supabase-configuratie ontbreekt. Er zijn geen gegevens opgevraagd.</p>
        </div>
      </main>
    )
  }

  const admin = await createAdminClient()
  const { data: logs, error } = await admin
    .from("audit_logs")
    .select("id, user_id, website_id, action, metadata, ip_address, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  const [{ data: usersResult }, { data: websites }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("websites").select("id, title, slug"),
  ])

  const userEmails = new Map(usersResult?.users.map((entry) => [entry.id, entry.email ?? entry.id]) ?? [])
  const websiteLabels = new Map(websites?.map((website) => [website.id, website.title || website.slug || website.id]) ?? [])

  return (
    <main className="min-h-screen bg-[var(--hero-bg)] text-white">
      <SharedHeader title="Auditlogs" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold">Recente auditlogs</h1>
            <p className="mt-2 text-sm text-white/60">De nieuwste 200 acties. IP-adressen en metadata zijn alleen op deze beveiligde pagina zichtbaar.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/admin" className="text-[var(--brand-blue)] hover:text-white">Adminoverzicht</Link>
            <Link href="/editor" className="text-[var(--brand-blue)] hover:text-white">Terug naar editor</Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-5 text-red-100">Auditlogs konden niet worden geladen.</div>
        ) : !logs?.length ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/60">Er zijn nog geen auditlogs.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Gebruiker</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Actie</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 align-top">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">{formatDate(log.created_at)}</td>
                    <td className="max-w-52 break-all px-4 py-3">{log.user_id ? userEmails.get(log.user_id) ?? log.user_id : "Systeem/verwijderd"}</td>
                    <td className="max-w-44 break-all px-4 py-3 text-white/70">{log.website_id ? websiteLabels.get(log.website_id) ?? log.website_id : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--brand-blue)]">{log.action}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">{log.ip_address || "—"}</td>
                    <td className="min-w-72 max-w-xl px-4 py-3">
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-black/20 p-2 text-xs text-white/65">{log.metadata ? JSON.stringify(log.metadata, null, 2) : "—"}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
