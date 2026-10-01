import { portalCopy, portalLocale } from "@/lib/quotes/i18n"
import { portalAccess } from "@/lib/quotes/portal"
import { versionColumns } from "@/lib/quotes/server"
import { quoteStatus, type QuoteVersion } from "@/lib/quotes/types"
import { formatMinorUnits } from "@/lib/booking/pricing"
import { CustomerActions } from "@/components/quotes/customer-actions"
import { PortalEntry } from "@/components/quotes/portal-entry"

export const metadata={title:"Uw aanvraag",robots:{index:false,follow:false},referrer:"no-referrer" as const}
export default async function CustomerRequestPage() {
  let access
  try {access=await portalAccess()}catch{return <main className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold">Uw aanvraag</h1><PortalEntry/><p className="mt-4">Deze toegang is verlopen of ingetrokken. Gebruik de persoonlijke link uit uw e-mail of vraag de ondernemer om een nieuwe link.</p></main>}
  const {admin,request}=access
  const locale=portalLocale(request.locale),copy=portalCopy(locale)
  const [{data:business},{data:quote},{data:entries},{data:messages}]=await Promise.all([
    admin.from("businesses").select("name").eq("id",request.business_id).single(),
    admin.from("quotes").select("id,number").eq("request_id",request.id).eq("business_id",request.business_id).maybeSingle(),
    admin.from("calendar_entries").select("id,status,start_at,end_at,timezone,entry_type").eq("contact_request_id",request.id).eq("business_id",request.business_id),
    admin.from("contact_request_messages").select("id,direction,body,created_at").eq("contact_request_id",request.id).eq("business_id",request.business_id).eq("customer_visible",true).order("created_at"),
  ])
  const {data:versionRows}=quote?await admin.from("quote_versions").select(versionColumns).eq("quote_id",quote.id).neq("status","draft").order("version",{ascending:false}):{data:[]}
  const versions=(versionRows||[]) as unknown as QuoteVersion[]
  const [{data:events},{data:invoices}]=await Promise.all([
    quote?admin.from("quote_events").select("id,event_type,created_at").eq("quote_id",quote.id).order("created_at") : Promise.resolve({data:[]}),
    entries?.length?admin.from("booking_invoices").select("id,invoice_number,total_minor,currency,document_type").eq("business_id",request.business_id).in("calendar_entry_id",entries.map(e=>e.id)).in("status",["issued","credited"]):Promise.resolve({data:[]}),
  ])
  const {data:financials}=entries?.length?await admin.from("booking_reservation_financials").select("calendar_entry_id,settlement_status").eq("business_id",request.business_id).in("calendar_entry_id",entries.map(e=>e.id)):{data:[]}
  const latest=versions[0]
  const progress=entries?.some(e=>e.status==="completed")?copy.completed:entries?.some(e=>e.status==="cancelled")?copy.cancelled:latest?quoteStatus(latest)==="accepted"?(entries?.some(e=>e.status==="confirmed")?copy.confirmed:copy.planning):`${copy.quote} ${copy[quoteStatus(latest)].toLowerCase()}`:request.status==="new"?copy.received:copy.processing
  const eventLabels:Record<string,string>={offer:copy.offered,withdraw:copy.withdrawn,accepted:copy.accepted,declined:copy.declined,scheduled:copy.confirmed}
  const entryLabels:Record<string,string>={pending:copy.pending,confirmed:copy.confirmed,cancelled:copy.cancelled,completed:copy.completed}
  return <main lang={locale} className="mx-auto max-w-3xl space-y-6 px-4 py-8"><PortalEntry/><header className="rounded-2xl border bg-card p-6"><p className="font-medium text-primary">{business?.name}</p><h1 className="mt-2 text-3xl font-semibold">{copy.page}</h1><p className="mt-3 text-lg">{progress}</p><p className="mt-2 text-sm text-muted-foreground">Aanvraag {request.id.slice(0,8)} · {request.name}</p><p className="mt-2 text-sm">{latest&&quoteStatus(latest)==="offered"?copy.next:copy.intro}</p></header>
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{copy.details}</h2><p className="mt-2">{request.service}</p><p className="mt-2 whitespace-pre-wrap">{request.message}</p>{request.preferred_date?<p className="mt-2">{copy.preferred}: {request.preferred_date}</p>:null}</section>
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{copy.timeline}</h2><ol className="mt-3 space-y-2 text-sm"><li>{new Date(request.created_at).toLocaleString(locale)} · {copy.received}</li>{events?.filter(e=>eventLabels[e.event_type]).map(e=><li key={e.id}>{new Date(e.created_at).toLocaleString(locale)} · {eventLabels[e.event_type]}</li>)}</ol></section>
    {versions.map(v=><section key={v.id} className="space-y-3 rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">{copy.quote} O-{quote?.number} · {copy.version} {v.version}</h2><p>{copy[quoteStatus(v)]} · {copy.valid} {v.valid_until?new Date(v.valid_until).toLocaleDateString(locale):"—"}</p><h3 className="font-medium">{v.snapshot.title}</h3>{v.snapshot.lines.map(line=><div key={line.id} className="flex flex-wrap justify-between gap-2 border-b py-2"><span>{line.description} · {line.quantity_milli/1000} × {formatMinorUnits(line.unit_price_minor)} excl. btw</span><strong>{formatMinorUnits(line.total_minor)}</strong></div>)}<p className="text-lg font-semibold">{copy.total}: {formatMinorUnits(v.snapshot.totalMinor)}</p><p className="whitespace-pre-wrap text-sm">{v.snapshot.terms}</p><a className="inline-block underline" href={`/api/customer-request/document?id=${v.id}`}>{copy.download}</a>{v.decided_at?<p>{copy.choice}: {new Date(v.decided_at).toLocaleString(locale)} · {v.decision_name}.</p>:null}{quoteStatus(v)==="offered"?<CustomerActions locale={v.snapshot.locale||locale} versionId={v.id}/>:null}</section>)}
    {!versions.length?<p>{copy.noneQuote}</p>:null}
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{copy.appointment}</h2>{entries?.length?entries.map(e=><p key={e.id} className="mt-3">{entryLabels[e.status]||copy.processing} · {new Date(e.start_at).toLocaleString(locale,{timeZone:e.timezone||"Europe/Amsterdam"})} ({e.timezone||"Europe/Amsterdam"})</p>):<p className="mt-3">{copy.noneAppointment}</p>}<p className="mt-3 text-sm text-muted-foreground">{copy.change}</p></section>
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{copy.invoices}</h2>{financials?.map(f=><p className="mt-2 text-sm" key={f.calendar_entry_id}>{copy.settlement}: {f.settlement_status==="paid"?copy.paid:f.settlement_status==="refunded"?copy.refunded:copy.open}</p>)}{invoices?.length?invoices.map(i=><a key={i.id} className="mt-3 block underline" href={`/api/customer-request/document?type=invoice&id=${i.id}`}>{i.document_type==="credit_note"?copy.credit:copy.invoice} {i.invoice_number} · {formatMinorUnits(i.document_type==="credit_note"?-i.total_minor:i.total_minor,i.currency,locale)}</a>):<p className="mt-3">{copy.noneInvoice}</p>}</section>
    <section className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{copy.messages}</h2>{messages?.map(m=><article key={m.id} className="mt-3 rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">{m.direction==="inbound"?copy.you:business?.name} · {new Date(m.created_at).toLocaleString(locale)}</p><p className="whitespace-pre-wrap">{m.body}</p></article>)}<CustomerActions locale={locale}/></section>
  </main>
}
