import Link from "next/link"
import { auditLabel, customerName, formatAdminDate, type AdminLog, type Customer } from "@/lib/admin/model"

export function ActivityList({ logs, customers = [], websites = [] }: { logs: AdminLog[] | null; customers?: Customer[]; websites?: { id: string; title: string; user_id: string }[] }) {
  const owners = new Map(customers.map((customer) => [customer.id, customer]))
  const sites = new Map(websites.map((site) => [site.id, site]))
  if (logs === null) return <p role="alert" className="text-sm text-destructive">Activiteit kon niet worden geladen.</p>
  if (!logs.length) return <p className="text-sm text-muted-foreground">Nog geen activiteit beschikbaar.</p>
  return <ul className="divide-y">{logs.map((log) => {
    const site = log.website_id ? sites.get(log.website_id) : null
    const owner = site ? owners.get(site.user_id) : log.user_id ? owners.get(log.user_id) : null
    return <li key={log.id} className="flex flex-wrap items-start justify-between gap-2 py-3"><div className="min-w-0"><Link href={`/admin/audit-logs?event=${log.id}#event-${log.id}`} className="text-sm font-medium text-primary hover:underline">{auditLabel(log.action)}</Link><p className="mt-1 break-words text-xs text-muted-foreground">{owner ? <Link href={`/admin/customers/${owner.id}`} className="hover:underline">{customerName(owner)}</Link> : "Platform"}{site ? <> · <Link href={`/admin/customers/${site.user_id}?website=${site.id}#website-${site.id}`} className="hover:underline">{site.title}</Link></> : null}</p>{auditLabel(log.action) === "Platformactie geregistreerd" ? <p className="mt-1 break-all text-xs text-muted-foreground">{log.action}</p> : null}</div><time className="text-xs text-muted-foreground" dateTime={log.created_at}>{formatAdminDate(log.created_at)}</time></li>
  })}</ul>
}
