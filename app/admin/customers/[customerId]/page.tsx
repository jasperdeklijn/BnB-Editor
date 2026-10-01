import Link from "next/link"
import { notFound } from "next/navigation"
import { ActivityList } from "@/components/admin/activity-list"
import { adminDatabase, allRows, requireAdmin, websiteColumns } from "@/lib/admin/server"
import { customerName, escapeLike, formatAdminDate, isUuid, type AdminDomain, type AdminLog, type AdminSubscription, type AdminWebsite } from "@/lib/admin/model"
import { PLATFORM_DOMAIN } from "@/lib/platform"

export const metadata = { title: "Klantgegevens | Beheer" }
const subscriptionLabels: Record<string, string> = { active: "Actief", trial: "Proefperiode", past_due: "Betaling achterstallig", canceled: "Opgezegd", expired: "Verlopen" }
const mailLabels: Record<string, string> = { new: "Nieuw", draft_ready: "Concept klaar", needs_review: "Controle nodig", replied: "Beantwoord", closed: "Gesloten", ignored: "Genegeerd" }

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ customerId: string }>; searchParams: Promise<{ website?: string }> }) {
  await requireAdmin()
  const { customerId } = await params
  if (!isUuid(customerId)) notFound()
  const selected = (await searchParams).website
  let admin
  try { admin = await adminDatabase() } catch { return <main className="p-6"><h1 className="text-2xl font-bold">Klantgegevens</h1><p role="alert" className="mt-4">Beheerconfiguratie ontbreekt.</p></main> }
  const { data, error } = await admin.auth.admin.getUserById(customerId)
  if (error) {
    if (error.status === 404 || error.code === "user_not_found") notFound()
    return <main className="p-6"><h1 className="text-2xl font-bold">Klantgegevens</h1><p role="alert" className="mt-4">Deze klant kon niet worden geladen.</p></main>
  }
  if (!data.user) notFound()
  const customer = data.user
  const [siteResult, subscriptionResult, mailResult] = await Promise.allSettled([
    allRows<AdminWebsite>((from, to) => admin.from("websites").select(websiteColumns).eq("user_id", customerId).order("id").range(from, to)),
    admin.from("subscriptions").select("user_id,plan_id,status,current_price,currency,current_period_end").eq("user_id", customerId).maybeSingle(),
    customer.email ? admin.from("mail_threads").select("id,subject_normalized,status,last_message_at").ilike("contact_email", escapeLike(customer.email)).order("last_message_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
  ])
  const websites = siteResult.status === "fulfilled" ? siteResult.value : null
  const subscription = subscriptionResult.status === "fulfilled" && !subscriptionResult.value.error ? subscriptionResult.value.data as AdminSubscription | null : undefined
  const mail = mailResult.status === "fulfilled" && !mailResult.value.error ? mailResult.value.data : null
  let logs: AdminLog[] | null = null
  try {
    let logQuery = admin.from("audit_logs").select("id,user_id,website_id,action,created_at").order("created_at", { ascending: false }).limit(20)
    logQuery = websites?.length ? logQuery.or(`user_id.eq.${customerId},website_id.in.(${websites.map((site) => site.id).join(",")})`) : logQuery.eq("user_id", customerId)
    const result = await logQuery
    if (!result.error) logs = result.data as AdminLog[]
  } catch { /* Activity has its own unavailable state. */ }
  let domains: AdminDomain[] | null = []
  if (websites?.length) {
    try { domains = await allRows<AdminDomain>((from, to) => admin.from("website_domains").select("website_id,domain,status,is_primary").in("website_id", websites.map((site) => site.id)).order("id").range(from, to)) } catch { domains = null }
  }
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
    <Link href="/admin/customers" className="text-sm text-primary hover:underline">← Alle klanten</Link>
    <div><h1 className="break-words text-3xl font-bold">{customerName(customer)}</h1><p className="mt-2 break-all text-sm text-muted-foreground">{customer.email ?? "Geen e-mailadres"}</p><p className="mt-1 text-xs text-muted-foreground">Account aangemaakt: {formatAdminDate(customer.created_at)}</p></div>
    <section aria-labelledby="subscription-heading" className="rounded-xl border bg-card p-5"><h2 id="subscription-heading" className="text-lg font-semibold">Abonnement</h2>{subscription === undefined ? <p role="alert" className="mt-3 text-sm text-destructive">Abonnement kon niet worden geladen.</p> : subscription ? <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="capitalize">{subscription.plan_id} · {subscriptionLabels[subscription.status] ?? subscription.status}</span><span>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(subscription.current_price))} per maand</span>{subscription.current_period_end ? <span>Huidige periode tot {formatAdminDate(subscription.current_period_end)}</span> : null}</div> : <p className="mt-3 text-sm text-muted-foreground">Geen opgeslagen abonnement.</p>}<p className="mt-3 text-xs text-muted-foreground">Opgeslagen facturatiegegevens. Tijdelijke toegang tot functies staat los van dit abonnement.</p></section>
    <section aria-labelledby="websites-heading" className="space-y-3"><h2 id="websites-heading" className="text-xl font-semibold">Websites</h2>{websites === null ? <p role="alert" className="text-sm text-destructive">Websites konden niet worden geladen.</p> : !websites.length ? <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Deze klant heeft nog geen website.</p> : websites.map((site) => {
      const siteDomains = domains?.filter((domain) => domain.website_id === site.id) ?? []
      const activeDomain = siteDomains.find((domain) => domain.status === "active" && domain.is_primary)?.domain ?? siteDomains.find((domain) => domain.status === "active")?.domain ?? site.custom_domain
      const publicUrl = `https://${activeDomain ?? `${site.slug}.${PLATFORM_DOMAIN}`}`
      return <article key={site.id} id={`website-${site.id}`} className={`scroll-mt-24 rounded-xl border bg-card p-5 ${selected === site.id ? "ring-2 ring-primary" : ""}`}><div className="flex flex-wrap justify-between gap-3"><h3 className="break-words font-semibold">{site.title || site.slug}</h3><span className="rounded-md bg-secondary px-2 py-1 text-xs">{site.published ? "Live" : "Concept"}</span></div><p className="mt-2 break-all text-sm text-muted-foreground">{site.slug}.{PLATFORM_DOMAIN}</p>{domains === null ? <p role="alert" className="mt-2 text-sm text-destructive">Domeingegevens niet beschikbaar.</p> : <ul className="mt-2 space-y-1 text-sm">{siteDomains.map((domain) => <li key={domain.domain} className="break-all">{domain.domain} · {domain.status === "active" ? "Actief" : domain.status === "pending" ? "In behandeling" : domain.status}{domain.is_primary ? " · Hoofddomein" : ""}</li>)}</ul>}<p className="mt-3 text-xs text-muted-foreground">Laatst gewijzigd: {formatAdminDate(site.updated_at)}</p>{site.published ? <a href={publicUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Open live website ↗</a> : <p className="mt-3 text-xs text-muted-foreground">Dit concept is nog niet openbaar.</p>}</article>
    })}</section>
    <section aria-labelledby="support-heading" className="rounded-xl border bg-card p-5"><h2 id="support-heading" className="text-xl font-semibold">Supportgesprekken</h2><p className="mt-1 text-xs text-muted-foreground">Laatste 20 gesprekken met het huidige account-e-mailadres.</p>{mail === null ? <p role="alert" className="mt-4 text-sm text-destructive">Supportgesprekken konden niet worden geladen.</p> : mail.length ? <ul className="mt-3 divide-y">{mail.map((thread) => <li key={thread.id} className="py-3"><Link className="text-sm font-medium text-primary hover:underline" href={`/admin/mailbox?thread=${thread.id}`}>{thread.subject_normalized || "Zonder onderwerp"}</Link><p className="mt-1 text-xs text-muted-foreground">{mailLabels[thread.status] ?? thread.status} · {formatAdminDate(thread.last_message_at)}</p></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Geen gekoppelde supportgesprekken gevonden.</p>}</section>
    <section aria-labelledby="activity-heading" className="rounded-xl border bg-card p-5"><h2 id="activity-heading" className="mb-3 text-xl font-semibold">Recente activiteit</h2><ActivityList logs={logs} customers={[customer]} websites={websites ?? []} /></section>
  </main>
}
