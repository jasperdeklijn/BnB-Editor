import Link from "next/link"
import { customerName, groupCustomers } from "@/lib/admin/model"
import type { AdminDomain, AdminSubscription, AdminWebsite, Customer } from "@/lib/admin/model"

export function CustomerResults({ customers, websites, domains, subscriptions, query, page = 1, base = "/admin/customers", days, limit = 20, filter = "all", newest = false }: {
  customers: Customer[]; websites: AdminWebsite[]; domains: AdminDomain[]; subscriptions: AdminSubscription[]; query: string; page?: number; base?: string; days?: number; limit?: number; filter?: string; newest?: boolean;
}) {
  const groups = groupCustomers(customers, websites, domains, query)
  if (newest) groups.sort((a, b) => Date.parse(b.customer.created_at) - Date.parse(a.customer.created_at) || a.customer.id.localeCompare(b.customer.id))
  const pages = Math.max(1, Math.ceil(groups.length / limit))
  const current = Math.min(page, pages)
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.user_id, subscription]))
  const url = (number: number) => `${base}?${new URLSearchParams({ q: query, page: String(number), filter, ...(newest ? { sort: "newest" } : {}), ...(days ? { days: String(days) } : {}) })}`
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{groups.length.toLocaleString("nl-NL")} klanten gevonden · gegroepeerd op klant, vervolgens website</p>
    {groups.slice((current - 1) * limit, current * limit).map(({ customer, websites: sites, totalWebsites }) => <article key={customer.id} className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><Link href={`/admin/customers/${customer.id}`} className="break-words font-semibold text-primary underline-offset-4 hover:underline">{customerName(customer)}</Link><p className="break-all text-sm text-muted-foreground">{customer.email ?? "Geen e-mailadres"}</p></div><p className="text-xs text-muted-foreground">{totalWebsites} websites · {subscriptionMap.get(customer.id)?.plan_id ?? "Geen abonnement"}</p></div>
      {sites.length ? <ul className="divide-y border-t">{sites.map((site) => <li key={site.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div className="min-w-0"><Link className="break-words text-sm font-medium text-primary hover:underline" href={`/admin/customers/${customer.id}?website=${site.id}#website-${site.id}`}>{site.title || site.slug}</Link><p className="break-all text-xs text-muted-foreground">{site.slug}{site.custom_domain ? ` · ${site.custom_domain}` : ""}{domains.filter((domain) => domain.website_id === site.id && domain.domain !== site.custom_domain).map((domain) => ` · ${domain.domain}`).join("")}</p></div><span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">{site.published ? "Live" : "Concept"}</span></li>)}</ul> : <p className="border-t p-4 text-sm text-muted-foreground">Deze klant heeft nog geen website.</p>}
    </article>)}
    {!groups.length ? <p className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">Geen klanten of websites gevonden. Pas de zoekopdracht aan.</p> : null}
    {pages > 1 ? <nav aria-label="Zoekresultaten pagina's" className="flex flex-wrap items-center gap-4 text-sm"><span>Pagina {current} van {pages}</span>{current > 1 ? <Link className="text-primary underline" href={url(current - 1)}>Vorige</Link> : null}{current < pages ? <Link className="text-primary underline" href={url(current + 1)}>Volgende</Link> : null}</nav> : null}
  </div>
}
