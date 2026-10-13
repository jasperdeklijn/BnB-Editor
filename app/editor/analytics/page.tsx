import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { AnalyticsReport } from "@/lib/analytics/shared"

export const metadata = { title: "Statistieken | FlexPagina" }
const count = (value: number) => value.toLocaleString("nl-NL")
const rate = (value: number, views: number) => views ? (100 * value / views).toLocaleString("nl-NL", { maximumFractionDigits: 2 }) + "%" : "Nog geen weergaven"
const sourceNames: Record<string,string> = { direct: "Direct / eigen website", search: "Zoekmachines", social: "Social media", referral: "Verwijzingen", desktop: "Desktop", mobile: "Mobiel", tablet: "Tablet" }
const isoDate = (date: Date) => date.toISOString().slice(0,10)
const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined
function Locked({ plan, children }: { plan: string; children: React.ReactNode }) {
  return <Card className="border-dashed p-5"><h2 className="font-semibold">{children}</h2><p className="mt-2 text-sm text-muted-foreground">Beschikbaar vanaf {plan}.</p><Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline" href="/editor/account/billing">Bekijk {plan}</Link></Card>
}
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ websiteId?: string; days?: string; from?: string; to?: string; trend?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: websites, error: websiteError } = await supabase.from("websites").select("id,title,slug,live_snapshot").eq("user_id",user.id).order("published",{ascending:false}).order("created_at",{ascending:false})
  const website = params.websiteId ? websites?.find((site)=>site.id===params.websiteId) : websites?.[0]
  if (!website || websiteError) return <EditorPageShell title="Statistieken" description="Bezoekers en prestaties van je website"><Card className="p-6">{websiteError ? "Websites konden niet worden geladen. Probeer opnieuw." : "Selecteer of maak eerst een eigen website."}<Link href="/editor" className="ml-2 text-primary underline">Websitebeheer</Link></Card></EditorPageShell>
  const today = new Date()
  const days = [7,30,90,366].includes(Number(params.days)) ? Number(params.days) : 7
  const from = validDate(params.from) ?? isoDate(new Date(today.getTime()-(days-1)*86400000))
  const to = validDate(params.to) ?? isoDate(today)
  const { data, error } = await supabase.rpc("website_analytics_report", { p_website_id: website.id, p_from: from, p_to: to })
  if (error || !data) return <EditorPageShell title="Statistieken" description="Rapport tijdelijk niet beschikbaar"><Card className="p-6"><p role="alert">Het rapport kon niet worden geladen. Controleer je datumkeuze of probeer opnieuw. Bij een nieuwe installatie is de analytics-migratie vereist.</p><Link className="mt-3 inline-flex min-h-11 items-center text-primary underline" href={`/editor/analytics?websiteId=${website.id}`}>Opnieuw laden</Link></Card></EditorPageShell>
  const report = data as AnalyticsReport
  const detailed = report.plan !== "bronze"
  const pages = ((website.live_snapshot as { pages?: Array<{id:string;title:string;slug:string}> } | null)?.pages ?? [])
  const lastMonthEnd = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),0))
  const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(),lastMonthEnd.getUTCMonth(),1))
  const monthlyResult = report.plan === "gold" ? await supabase.rpc("website_analytics_report", { p_website_id:website.id,p_from:isoDate(lastMonthStart),p_to:isoDate(lastMonthEnd) }) : null
  const monthly = monthlyResult?.data as AnalyticsReport | undefined
  const trend = new Map<string,{views:number;visitors:number}>()
  for (const item of report.trend ?? []) {
    const date = new Date(item.day + "T00:00:00Z")
    if (params.trend === "weekly") date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7))
    const day = isoDate(date), previous = trend.get(day) ?? {views:0,visitors:0}
    trend.set(day,{views:previous.views+item.views,visitors:previous.visitors+item.visitors})
  }
  return <EditorPageShell title="Statistieken" description={`${website.title || website.slug} · ${report.plan} · ${report.from} t/m ${report.to} (UTC)`} maxWidth="6xl">
    <div className="mb-6 flex flex-wrap items-center gap-4"><Link className="inline-flex min-h-11 items-center text-primary underline" href={`/editor?websiteId=${website.id}`}>Websitebeheer</Link><Link className="inline-flex min-h-11 items-center text-primary underline" href={`/editor/seo?websiteId=${website.id}`}>Privacy en analytics instellen</Link></div>
    <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
      <label className="text-sm">Website<select className="mt-1 block min-h-11 rounded-md border bg-background px-3" name="websiteId" defaultValue={website.id}>{websites?.map((site)=><option key={site.id} value={site.id}>{site.title || site.slug}</option>)}</select></label>
      <label className="text-sm">Vanaf<input className="mt-1 block min-h-11 rounded-md border bg-background px-3" name="from" type="date" required defaultValue={report.from} max={isoDate(today)} /></label>
      <label className="text-sm">Tot en met<input className="mt-1 block min-h-11 rounded-md border bg-background px-3" name="to" type="date" required defaultValue={report.to} max={isoDate(today)} /></label>
      {detailed ? <label className="text-sm">Trend<select className="mt-1 block min-h-11 rounded-md border bg-background px-3" name="trend" defaultValue={params.trend ?? "daily"}><option value="daily">Dagelijks</option><option value="weekly">Wekelijks</option></select></label> : null}
      <Button type="submit">Rapport tonen</Button>
    </form>
    <nav aria-label="Rapportperiode" className="mb-6 flex flex-wrap gap-3">{[7,30,...(detailed?[90]:[]),...(report.plan==='gold'?[366]:[])].map((period)=><Link key={period} className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm hover:bg-primary/10" href={`/editor/analytics?websiteId=${website.id}&days=${period}`}>{period===366?"12 maanden":period+" dagen"}</Link>)}</nav>
    {!report.enabled ? <Card className="mb-6 border-amber-300 p-5"><p>Statistieken zijn uitgeschakeld. Schakel ze in bij Privacy en analytics. Bezoekers worden pas gemeten na toestemming; bestaande rapporten blijven beschikbaar tot hun bewaartermijn afloopt.</p></Card> : null}
    <div className="grid gap-4 sm:grid-cols-2"><Card className="p-6"><h2 className="text-sm text-muted-foreground">Geschatte bezoekers</h2><p className="mt-2 text-3xl font-bold text-primary">{count(report.visitors)}</p></Card><Card className="p-6"><h2 className="text-sm text-muted-foreground">Paginaweergaven</h2><p className="mt-2 text-3xl font-bold text-primary">{count(report.views)}</p></Card></div>
    <p className="my-4 text-sm text-muted-foreground">Alleen toestemmende bezoekers. Een bezoeker is een browsersessie van maximaal 30 minuten per website en UTC-dag. Dezelfde persoon kan opnieuw meetellen bij een nieuwe sessie, browser of domein. Totalen over meerdere dagen zijn opgetelde dagschattingen. GA4-rapporten zijn hier niet verbonden.</p>
    {!report.views ? <Card className="mb-6 p-6">Nog geen gemeten verkeer in deze periode. Publiceer je website, schakel statistieken in en wacht op bezoekers die toestemming geven.</Card> : null}
    {report.daysWithData < 7 ? <p className="mb-6 text-sm text-muted-foreground">Er zijn minder dan zeven dagen met gemeten verkeer. Trends zijn nog beperkt; ontbrekende dagen kunnen ook betekenen dat bezoekers geen toestemming gaven.</p> : null}
    {detailed ? <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6"><h2 className="font-semibold">Populaire pagina&apos;s</h2><ul className="mt-4 space-y-3">{report.pages?.map((item)=><li className="flex justify-between gap-3" key={item.pageId}><span>{pages.find((page)=>page.id===item.pageId)?.title ?? "Eerder gepubliceerde pagina"}</span><span>{count(item.views)}</span></li>)}</ul>{!report.pages?.length ? <p className="mt-3 text-sm text-muted-foreground">Nog geen paginaweergaven.</p> : null}</Card>
      <Card className="p-6"><h2 className="font-semibold">Verkeersbronnen en apparaten</h2>{[report.sources,report.devices].map((rows,index)=><ul className="mt-4 space-y-2" key={index}>{rows?.map((item)=><li className="flex justify-between gap-3" key={item.name}><span>{sourceNames[item.name] ?? item.name}</span><span>{count(item.views)}</span></li>)}</ul>)}</Card>
      <Card className="overflow-x-auto p-6 lg:col-span-2"><h2 className="font-semibold">{params.trend==="weekly"?"Wekelijkse":"Dagelijkse"} trend</h2><table className="mt-4 w-full text-left text-sm"><caption className="sr-only">Bezoekerstrend in UTC</caption><thead><tr><th className="py-2" scope="col">{params.trend==='weekly'?"Week vanaf":"Dag"}</th><th scope="col">Geschatte bezoekers</th><th scope="col">Weergaven</th></tr></thead><tbody>{[...trend].map(([day,item])=><tr className="border-t" key={day}><td className="py-2">{day}</td><td>{count(item.visitors)}</td><td>{count(item.views)}</td></tr>)}</tbody></table></Card>
    </div> : <Locked plan="Silver">Populaire pagina&apos;s, verkeersbronnen, apparaten en trends</Locked>}
    <div className="mt-6">{report.conversions ? <Card className="p-6"><h2 className="font-semibold">Conversies</h2><p className="mt-3">Succesvolle contactformulieren: {count(report.conversions.contact)} · {rate(report.conversions.contact,report.views)}</p>{report.booking ? <p className="mt-2">Bevestigde boekingen: {count(report.conversions.booking ?? 0)} · {rate(report.conversions.booking ?? 0,report.views)}</p> : <p className="mt-2 text-sm text-muted-foreground">Boekingsconversies vereisen een actieve Booking &amp; Facturatie add-on, ook bij Gold. <Link href="/editor/account/billing" className="underline">Bekijk add-on</Link></p>}<p className="mt-3 text-xs text-muted-foreground">Conversieratio = gemeten backend-successen / gemeten paginaweergaven × 100. Contacten tellen na succesvol opslaan; boekingen na bevestiging. Alleen inzendingen met een geldige analytics-toestemming tellen. Dit is geen percentage unieke bezoekers; vertraagde bevestigingen kunnen in een andere periode vallen.</p></Card> : <Locked plan="Gold">Conversies en maandrapport</Locked>}</div>
    {report.plan==='gold' ? <Card className="mt-6 p-6"><h2 className="font-semibold">Maandrapport · {lastMonthStart.toLocaleDateString('nl-NL',{month:'long',year:'numeric',timeZone:'UTC'})}</h2>{monthly ? <><p className="mt-3">{count(monthly.visitors)} geschatte bezoekers · {count(monthly.views)} paginaweergaven · {count(monthly.conversions?.contact ?? 0)} contactformulieren{monthly.booking ? " · " + count(monthly.conversions?.booking ?? 0) + " bevestigde boekingen" : ""}.</p><p className="mt-3 text-sm text-muted-foreground">{monthly.views ? "Bekijk de populairste pagina's en verkeersbronnen om je website te verbeteren." : "Nog onvoldoende historie voor deze maand."} Het rapport is beschikbaar in dit dashboard. E-mailrapporten volgen later.</p></> : <p role="alert" className="mt-3">Maandrapport tijdelijk niet beschikbaar.</p>}</Card> : null}
  </EditorPageShell>
}
