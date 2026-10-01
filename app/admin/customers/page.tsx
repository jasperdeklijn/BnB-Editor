import Link from "next/link"
import { CustomerSearch } from "@/components/admin/customer-search"
import { CustomerResults } from "@/components/admin/customer-results"
import { customerDirectory, requireAdmin } from "@/lib/admin/server"
import { normalizeQuery, periodBounds, periodDays } from "@/lib/admin/model"

export const metadata = { title: "Klanten en websites | Beheer" }

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; filter?: string; sort?: string; days?: string }> }) {
  await requireAdmin()
  const params = await searchParams
  const query = normalizeQuery(params.q)
  const filter = ["paid", "new"].includes(params.filter ?? "") ? params.filter! : "all"
  const days = periodDays(params.days)
  let directory
  try { directory = await customerDirectory() } catch { return <main className="p-6"><h1 className="text-2xl font-bold">Klanten</h1><p role="alert" className="mt-4">Klantgegevens konden niet worden geladen. Controleer de beheerconfiguratie.</p></main> }
  const paid = new Set(directory.subscriptions.filter((subscription) => subscription.status === "active" && Number(subscription.current_price) > 0).map((subscription) => subscription.user_id))
  const bounds = periodBounds(days)
  const customers = directory.customers.filter((customer) => filter === "paid" ? paid.has(customer.id) : filter === "new" ? Date.parse(customer.created_at) >= Date.parse(bounds.start) && Date.parse(customer.created_at) < Date.parse(bounds.now) : true)
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div><h1 className="text-3xl font-bold">Klanten en hun websites</h1><p className="mt-2 text-sm text-muted-foreground">Alle geregistreerde accounts, met live websites en concepten per klant.</p></div>
    <CustomerSearch query={query} days={days} filter={filter} />
    <nav aria-label="Klantenfilters" className="flex flex-wrap gap-2">{[{ id: "all", title: "Alle klanten" }, { id: "new", title: `Nieuw · ${days} dagen` }, { id: "paid", title: "Actief betaald abonnement" }].map((item) => <Link key={item.id} href={`/admin/customers?${new URLSearchParams({ q: query, filter: item.id, days: String(days) })}`} aria-current={filter === item.id ? "true" : undefined} className={`rounded-lg border px-3 py-2 text-sm ${filter === item.id ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}>{item.title}</Link>)}</nav>
    {directory.errors.length ? <p role="alert" className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">Het overzicht is niet beschikbaar: {directory.errors.join(", ")} konden niet worden geladen. <Link href={`/admin/customers?q=${encodeURIComponent(query)}`} className="underline">Opnieuw proberen</Link></p> : <CustomerResults {...directory} customers={customers} query={query} page={Math.max(1, Math.floor(Number(params.page) || 1))} days={days} filter={filter} newest={params.sort === "newest" || filter === "new"} />}
  </main>
}
