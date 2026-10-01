export type Customer = { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> }
export type AdminWebsite = {
  id: string; user_id: string; title: string; slug: string; custom_domain: string | null;
  published: boolean; created_at: string; updated_at: string; applied_template_id?: string | null;
}
export type AdminDomain = { website_id: string; domain: string; status: string; is_primary: boolean }
export type AdminSubscription = { user_id: string; plan_id: string; status: string; current_price: number; currency: string; current_period_end: string | null }
export type AdminLog = { id: string; user_id: string | null; website_id: string | null; action: string; created_at: string }

export function customerName(customer: Customer) {
  for (const name of [customer.user_metadata?.full_name, customer.user_metadata?.name]) {
    if (typeof name === "string" && name.trim()) return name.trim()
  }
  return customer.email || "Klant zonder e-mailadres"
}

export function normalizeQuery(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 200) ?? ""
}

export function periodDays(value: string | string[] | undefined): 7 | 30 | 90 {
  const number = Number(Array.isArray(value) ? value[0] : value)
  return number === 7 || number === 90 ? number : 30
}

export function periodBounds(days: number, now = new Date()) {
  return { now: now.toISOString(), start: new Date(+now - days * 86400000).toISOString(), previous: new Date(+now - 2 * days * 86400000).toISOString() }
}

export function countNewAccounts(customers: Customer[], bounds: ReturnType<typeof periodBounds>) {
  let current = 0; let previous = 0
  const start = Date.parse(bounds.start); const end = Date.parse(bounds.now); const previousStart = Date.parse(bounds.previous)
  for (const customer of customers) {
    const created = Date.parse(customer.created_at)
    if (created >= start && created < end) current++
    else if (created >= previousStart && created < start) previous++
  }
  return { current, previous }
}

export function comparison(current: number | null, previous: number | null) {
  if (current === null || previous === null) return "Vergelijking niet beschikbaar"
  if (previous === 0) return current === 0 ? "Geen verandering" : `+${current.toLocaleString("nl-NL")} · vorige periode 0`
  const percent = Math.round((current - previous) / previous * 100)
  return `${percent > 0 ? "+" : ""}${percent}% ten opzichte van vorige periode`
}

export function groupCustomers(customers: Customer[], websites: AdminWebsite[], domains: AdminDomain[], query: string) {
  const sitesByOwner = new Map<string, AdminWebsite[]>()
  const domainsBySite = new Map<string, string[]>()
  for (const domain of domains) domainsBySite.set(domain.website_id, [...(domainsBySite.get(domain.website_id) ?? []), domain.domain])
  for (const site of websites) sitesByOwner.set(site.user_id, [...(sitesByOwner.get(site.user_id) ?? []), site])
  const term = query.toLocaleLowerCase("nl-NL")
  return customers.map((customer) => {
    const owned = sitesByOwner.get(customer.id) ?? []
    const ownerMatches = [customerName(customer), customer.email, customer.id].some((value) => value?.toLocaleLowerCase("nl-NL").includes(term))
    const matchingSites = owned.filter((site) => [site.title, site.slug, site.custom_domain, ...(domainsBySite.get(site.id) ?? [])].some((value) => value?.toLocaleLowerCase("nl-NL").includes(term)))
    return { customer, websites: ownerMatches || !term ? owned : matchingSites, totalWebsites: owned.length, matches: !term || ownerMatches || matchingSites.length > 0 }
  }).filter((group) => group.matches).sort((a, b) => customerName(a.customer).localeCompare(customerName(b.customer), "nl-NL") || a.customer.id.localeCompare(b.customer.id))
}

const ACTIONS: Record<string, string> = {
  login: "Ingelogd", logout: "Uitgelogd", "password.changed": "Wachtwoord gewijzigd", "account.deleted": "Account verwijderd",
  "website.created": "Website aangemaakt", "website.published": "Website gepubliceerd", "website.unpublished": "Website offline gezet", "website.deleted": "Website verwijderd", "website.publish_denied": "Publicatie tegengehouden",
  "domain.added": "Domein toegevoegd", "domain.add_failed": "Domein toevoegen mislukt", "domain.primary_changed": "Hoofddomein gewijzigd", "domain.removal_started": "Domeinverwijdering gestart", "domain.removal_failed": "Domeinverwijdering mislukt", "domain.removed": "Domein verwijderd",
  "domain.verification_started": "Domeincontrole gestart", "domain.verification_succeeded": "Domein bevestigd", "domain.verification_failed": "Domeincontrole mislukt",
  "mail.reply_sent": "Supportantwoord verzonden", "mail.thread_updated": "Supportgesprek bijgewerkt", "mail.sync_started": "Mailboxsynchronisatie gestart", "mail.draft_generated": "Antwoordvoorstel gemaakt", "mail.knowledge_changed": "Standaardantwoord gewijzigd",
  "onboarding.step_completed": "Aanmeldstap afgerond", "onboarding.completed": "Aanmelding afgerond", "contact_request.updated": "Aanvraag bijgewerkt", "contact_request.reply_sent": "Antwoord op aanvraag verzonden", "contact_request.template_saved": "Antwoordsjabloon opgeslagen",
}

export function auditLabel(action: string) { return ACTIONS[action] ?? "Platformactie geregistreerd" }
export function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(value))
}

export function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) }
export function escapeLike(value: string) { return value.replace(/[\\%_]/g, "\\$&") }
