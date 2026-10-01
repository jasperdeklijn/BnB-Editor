import Link from "next/link"
import { ArrowRight, CreditCard, Globe2, Mail, UserPlus } from "lucide-react"
import { getAllTemplatePresets } from "@/components/templates/category-presets"
import { CustomerSearch } from "@/components/admin/customer-search"
import { CustomerResults } from "@/components/admin/customer-results"
import { ActivityList } from "@/components/admin/activity-list"
import { adminDatabase, customerDirectory, requireAdmin } from "@/lib/admin/server"
import { comparison, formatAdminDate, normalizeQuery, periodDays } from "@/lib/admin/model"
import { loadOverview } from "@/lib/admin/overview"

export const metadata = { title: "Adminoverzicht | Beheer", description: "Dagelijks beheer van klanten, support en platform." }

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string; q?: string; page?: string }> }) {
  await requireAdmin()
  const params = await searchParams
  const days = periodDays(params.days)
  const query = normalizeQuery(params.q)
  try { await adminDatabase() } catch { return <main className="p-6"><h1 className="text-2xl font-bold">Adminoverzicht</h1><p role="alert" className="mt-4 rounded-xl border bg-card p-5">De beheerconfiguratie ontbreekt. Gegevens kunnen niet worden geladen.</p></main> }
  const [data, directory] = await Promise.all([loadOverview(days), query ? customerDirectory() : Promise.resolve(null)])
  const stats = [
    { title: "Nieuwe accounts", value: data.accounts.current, detail: `Laatste ${days} dagen`, trend: comparison(data.accounts.current, data.accounts.previous), href: `/admin/customers?filter=new&sort=newest&days=${days}`, icon: UserPlus },
    { title: "Live websites", value: data.live, detail: "Momenteel gepubliceerd", href: "/admin/websites", icon: Globe2 },
    { title: "Actieve betaalde abonnementen", value: data.paid, detail: "Actief · maandprijs boven € 0", href: "/admin/customers?filter=paid", icon: CreditCard },
    { title: "Open supportgesprekken", value: data.openMail, detail: "Nieuw, concept klaar of controle nodig", href: "/admin/mailbox?filter=open", icon: Mail },
  ]
  const names = new Map(getAllTemplatePresets().map((template) => [template.id, template.name]))
  return <main className="mx-auto max-w-[1500px] space-y-8 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-primary">Dagelijks beheer</p><h1 className="mt-1 text-3xl font-bold">Adminoverzicht</h1><p className="mt-2 text-sm text-muted-foreground">Wat vraagt aandacht en hoe ontwikkelt het platform zich?</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Statistiekperiode">{[7, 30, 90].map((period) => <Link key={period} href={`/admin?${new URLSearchParams({ days: String(period), ...(query ? { q: query } : {}) })}`} aria-current={period === days ? "true" : undefined} className={`rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring ${period === days ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}>{period} dagen</Link>)}</div>
    </div>
    <section aria-labelledby="attention-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 id="attention-heading" className="text-xl font-semibold">Aandacht nodig</h2><p className="text-xs text-muted-foreground">Oudste eerst · maximaal 4 per onderdeel</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{data.attention.map((group) => <article key={group.title} className="rounded-xl border bg-card p-4">
        <Link href={group.href} className="flex items-start justify-between gap-3 text-sm font-semibold text-primary hover:underline"><span>{group.title}</span><span className="rounded-md bg-secondary px-2 py-1">{group.count ?? "—"}</span></Link>
        {group.error ? <p role="alert" className="mt-4 text-sm text-destructive">Dit onderdeel kon niet worden geladen.</p> : group.items.length ? <ul className="mt-3 divide-y">{group.items.map((item) => <li key={item.id} className="py-3"><Link href={item.href} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring"><p className="break-words text-sm font-medium hover:text-primary">{item.title}</p><p className="mt-1 break-words text-xs text-muted-foreground">{item.description}</p><time className="mt-1 block text-xs text-muted-foreground" dateTime={item.createdAt}>{formatAdminDate(item.createdAt)}</time></Link></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Geen open aandachtspunten.</p>}
      </article>)}</div>
    </section>
    <section aria-labelledby="search-heading" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="search-heading" className="text-xl font-semibold">Klanten en hun websites</h2><Link href="/admin/customers" className="text-sm font-medium text-primary hover:underline">Alle klanten bekijken →</Link></div>
      <CustomerSearch query={query} action="/admin" days={days} />
      {directory ? directory.errors.length ? <p role="alert" className="text-sm text-destructive">Zoeken kon niet volledig worden geladen: {directory.errors.join(", ")}. <Link href={`/admin?days=${days}&q=${encodeURIComponent(query)}`} className="underline">Opnieuw proberen</Link></p> : <CustomerResults {...directory} query={query} page={Math.max(1, Math.floor(Number(params.page) || 1))} base="/admin" days={days} limit={5} /> : <p className="text-sm text-muted-foreground">Zoek op klant, e-mailadres, website of domein. Resultaten staan per klant bij elkaar.</p>}
    </section>
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="mb-4 text-xl font-semibold">Platformcijfers</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ title, value, detail, trend, href, icon: Icon }) => <Link key={title} href={href} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium text-muted-foreground">{title}</h3><Icon className="size-5 shrink-0 text-primary" aria-hidden="true" /></div><p className="mt-3 text-3xl font-bold">{value === null ? "—" : value.toLocaleString("nl-NL")}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p>{value === null ? <p className="mt-2 text-xs text-destructive">Gegevens niet beschikbaar</p> : trend ? <p className="mt-2 text-xs text-primary">{trend}</p> : <p className="mt-2 text-xs text-muted-foreground">Huidige stand · geen historische vergelijking</p>}</Link>)}</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{[{ title: "Bezoekerssessies", value: data.visits, previous: data.previousVisits }, { title: "Ontvangen aanvragen", value: data.requests, previous: data.previousRequests }].map((metric) => <div key={metric.title} className="rounded-xl border bg-card p-4"><p className="text-sm font-medium">{metric.title} · laatste {days} dagen</p><p className="mt-2 text-xl font-bold">{metric.value?.toLocaleString("nl-NL") ?? "Niet beschikbaar"}</p><p className="mt-1 text-xs text-muted-foreground">{comparison(metric.value, metric.previous)}</p></div>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Bijgewerkt: {formatAdminDate(data.updatedAt)}. Abonnementstatus en prijs zijn geen bewijs van ontvangen betalingen.</p>
    </section>
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <section className="rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="activity-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="activity-heading" className="text-xl font-semibold">Recente activiteit</h2><Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">Alles bekijken</Link></div><ActivityList logs={data.logs} customers={data.customers ?? []} websites={data.websites ?? []} /></section>
      <section className="rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="templates-heading"><h2 id="templates-heading" className="text-lg font-semibold">Meest gebruikte templates</h2><p className="mt-1 text-xs text-muted-foreground">Laatst toegepast per website, inclusief concepten</p>{data.templates === null ? <p role="alert" className="mt-4 text-sm text-destructive">Templategebruik kon niet worden geladen.</p> : data.templates.length ? <ol className="mt-4 divide-y">{data.templates.map(([id, count], index) => <li key={id} className="flex justify-between gap-3 py-3 text-sm"><span>{index + 1}. {names.get(id) ?? id}</span><span className="shrink-0 text-muted-foreground">{count} websites</span></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">Nog geen templategebruik gemeten.</p>}<Link href="/admin/websites" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">Websites bekijken<ArrowRight className="size-4" aria-hidden="true" /></Link></section>
    </div>
  </main>
}
