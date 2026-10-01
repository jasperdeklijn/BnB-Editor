import "server-only"
import { adminDatabase, allCustomers, allWebsites } from "./server"
import { countNewAccounts, periodBounds, type AdminLog } from "./model"

export type AttentionItem = { id: string; title: string; description: string; href: string; createdAt: string }
export type AttentionGroup = { title: string; count: number | null; href: string; items: AttentionItem[]; error: boolean }

export async function loadOverview(days: number) {
  const admin = await adminDatabase()
  const bounds = periodBounds(days)
  const results = await Promise.allSettled([
    allCustomers(admin),
    admin.from("websites").select("*", { count: "exact", head: true }).eq("published", true),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active").gt("current_price", 0),
    admin.from("mail_threads").select("*", { count: "exact", head: true }).in("status", ["new", "draft_ready", "needs_review"]),
    admin.from("website_visits").select("*", { count: "exact", head: true }).gte("visited_at", bounds.start).lt("visited_at", bounds.now),
    admin.from("website_visits").select("*", { count: "exact", head: true }).gte("visited_at", bounds.previous).lt("visited_at", bounds.start),
    admin.from("contact_requests").select("*", { count: "exact", head: true }).gte("created_at", bounds.start).lt("created_at", bounds.now),
    admin.from("contact_requests").select("*", { count: "exact", head: true }).gte("created_at", bounds.previous).lt("created_at", bounds.start),
    admin.from("mail_threads").select("id,subject_normalized,contact_email,last_message_at", { count: "exact" }).gt("unread_count", 0).order("last_message_at").limit(4),
    admin.from("agent_approvals").select("id,action_type,requested_at", { count: "exact" }).eq("status", "pending").or(`expires_at.is.null,expires_at.gt.${bounds.now}`).order("requested_at").limit(4),
    admin.from("agent_jobs").select("id,job_type,created_at,status", { count: "exact" }).in("status", ["failed", "dead_letter"]).order("created_at").limit(4),
    admin.from("website_transfer_requests").select("id,business_name,status,created_at", { count: "exact" }).or("status.in.(requested,processing,checking,corrections,approved),and(review_requested_at.not.is.null,reviewed_at.is.null,status.neq.published)").order("created_at").limit(4),
    admin.from("audit_logs").select("id,user_id,website_id,action,created_at").order("created_at", { ascending: false }).limit(8),
    allWebsites(admin),
  ])
  const result = (index: number) => {
    const value = results[index]
    if (value.status === "rejected") return null
    return value.value as { data: Record<string, unknown>[] | null; count?: number | null; error?: unknown }
  }
  const count = (index: number) => { const value = result(index); return !value || value.error ? null : value.count ?? null }
  const rows = (index: number) => { const value = result(index); return !value || value.error ? null : value.data ?? [] }
  const customersResult = results[0]
  const customers = customersResult.status === "fulfilled" ? customersResult.value as Awaited<ReturnType<typeof allCustomers>> : null
  const accounts = customers ? countNewAccounts(customers, bounds) : { current: null, previous: null }
  const sitesResult = results[13]
  const websites = sitesResult.status === "fulfilled" ? sitesResult.value as { id: string; title: string; user_id: string; applied_template_id: string | null }[] : null
  const counts = new Map<string, number>()
  for (const site of websites ?? []) if (site.applied_template_id) counts.set(site.applied_template_id, (counts.get(site.applied_template_id) ?? 0) + 1)
  const group = (index: number, title: string, href: string, map: (row: Record<string, unknown>) => AttentionItem): AttentionGroup => ({ title, href, count: count(index), error: rows(index) === null, items: (rows(index) ?? []).map(map) })
  const attention = [
    group(8, "Ongelezen supportgesprekken", "/admin/mailbox?filter=unread", (r) => ({ id: String(r.id), title: String(r.subject_normalized || "Zonder onderwerp"), description: String(r.contact_email), createdAt: String(r.last_message_at), href: `/admin/mailbox?thread=${r.id}` })),
    group(9, "AI-goedkeuringen", "/admin/agents#approvals", (r) => ({ id: String(r.id), title: "Antwoordvoorstel controleren", description: "Menselijke goedkeuring nodig", createdAt: String(r.requested_at), href: `/admin/agents?approval=${r.id}#approval-${r.id}` })),
    group(10, "Mislukte agenttaken", "/admin/agents#history", (r) => ({ id: String(r.id), title: "Agenttaak herstellen", description: r.status === "dead_letter" ? "Pogingen uitgeput" : "Uitvoering mislukt", createdAt: String(r.created_at), href: `/admin/agents?job=${r.id}#job-${r.id}` })),
    group(11, "FlexStart behandelen", "/admin/flexstart", (r) => ({ id: String(r.id), title: String(r.business_name), description: r.status === "approved" ? "Publicatiecontrole afronden" : r.status === "corrections" ? "Correcties verwerken" : "Aanvraag of review behandelen", createdAt: String(r.created_at), href: `/admin/flexstart?request=${r.id}` })),
  ]
  return { accounts, customers, websites, live: count(1), paid: count(2), openMail: count(3), visits: count(4), previousVisits: count(5), requests: count(6), previousRequests: count(7), attention, logs: rows(12) as AdminLog[] | null, templates: websites ? [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5) : null, updatedAt: bounds.now }
}
