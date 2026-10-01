import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/security"
import { auditLabel, isUuid } from "@/lib/admin/model"

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

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()
  const params = await searchParams
  const eventId = params.event && isUuid(params.event) ? params.event : undefined

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="min-h-full bg-muted text-foreground">

        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-3xl font-bold">Auditlogs niet beschikbaar</h1>
          <p className="mt-3 text-muted-foreground">De server-side Supabase-configuratie ontbreekt. Er zijn geen gegevens opgevraagd.</p>
        </div>
      </main>
    )
  }

  const admin = await createAdminClient()
  let query = admin
    .from("audit_logs")
    .select("id, user_id, website_id, action, metadata, ip_address, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
  if (eventId) query = query.eq("id", eventId)
  const { data: logs, error } = await query

  const userIds = [...new Set((logs ?? []).map((log) => log.user_id).filter(Boolean))] as string[]
  const websiteIds = [...new Set((logs ?? []).map((log) => log.website_id).filter(Boolean))] as string[]
  const [usersResult, websitesResult] = await Promise.all([
    Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id))),
    websiteIds.length ? admin.from("websites").select("id,title,slug,user_id").in("id", websiteIds) : Promise.resolve({ data: [], error: null }),
  ])

  const userEmails = new Map(usersResult.flatMap((result) => result.data.user ? [[result.data.user.id, result.data.user.email ?? result.data.user.id] as const] : []))
  const websites = websitesResult.data ?? []
  const websiteLabels = new Map(websites.map((website) => [website.id, website.title || website.slug || website.id]))
  const siteOwners = new Map(websites.map((website) => [website.id, website.user_id]))
  const contextError = usersResult.some((result) => result.error) || websitesResult.error

  return (
    <main className="min-h-full bg-muted text-foreground">

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold">{eventId ? "Auditactie" : "Recente auditlogs"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{eventId ? "Details van de geselecteerde actie." : "De nieuwste 200 acties."} IP-adressen en metadata zijn alleen op deze beveiligde pagina zichtbaar.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/admin" className="text-primary hover:text-foreground">Adminoverzicht</Link>
            {eventId ? <Link href="/admin/audit-logs" className="text-primary hover:underline">Alle auditlogs</Link> : null}
            <Link href="/editor" className="text-primary hover:text-foreground">Terug naar editor</Link>
          </div>
        </div>

        {contextError ? <p role="alert" className="mb-4 text-sm text-destructive">Klant- of websitegegevens konden niet volledig worden geladen.</p> : null}
        {error ? (
          <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-5 text-red-800">Auditlogs konden niet worden geladen.</div>
        ) : !logs?.length ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Er zijn nog geen auditlogs.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-card text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Gebruiker</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Actie</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border align-top">
                {logs.map((log) => (
                  <tr key={log.id} id={`event-${log.id}`} className="scroll-mt-24 hover:bg-secondary">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(log.created_at)}</td>
                    <td className="max-w-52 break-all px-4 py-3">{log.user_id ? <Link className="text-primary hover:underline" href={`/admin/customers/${log.user_id}`}>{userEmails.get(log.user_id) ?? log.user_id}</Link> : "Systeem/verwijderd"}</td>
                    <td className="max-w-44 break-all px-4 py-3 text-muted-foreground">{log.website_id && siteOwners.get(log.website_id) ? <Link className="text-primary hover:underline" href={`/admin/customers/${siteOwners.get(log.website_id)}?website=${log.website_id}#website-${log.website_id}`}>{websiteLabels.get(log.website_id) ?? log.website_id}</Link> : log.website_id ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-primary"><Link href={`/admin/audit-logs?event=${log.id}#event-${log.id}`} className="hover:underline">{auditLabel(log.action)}</Link><p className="mt-1 break-all text-xs font-normal text-muted-foreground">{log.action}</p></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.ip_address || "—"}</td>
                    <td className="min-w-72 max-w-xl px-4 py-3">
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs text-muted-foreground">{log.metadata ? JSON.stringify(log.metadata, null, 2) : "—"}</pre>
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
