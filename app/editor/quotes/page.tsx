import Link from "next/link"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { ownerContext, versionColumns, quoteWritesEnabled } from "@/lib/quotes/server"
import { quoteLabels, type QuoteSnapshot, type QuoteVersion } from "@/lib/quotes/types"
import { QuoteEditor } from "@/components/quotes/quote-editor"
import { ReceiptSetting } from "@/components/quotes/receipt-setting"

export default async function QuotesPage({searchParams}:{searchParams:Promise<{quote?:string;q?:string;status?:string;page?:string}>}) {
  const params=await searchParams,{db}=await ownerContext()
  const page=Math.max(1,Math.min(100000,Number.parseInt(params.page||"1",10)||1))
  const search=(params.q||"").replace(/[^\p{L}\p{N} @.+-]/gu," ").trim().slice(0,100)
  let query=db.from("quote_overview").select("id,number,request_id,business_id,customer_name,status",{count:"exact"}).order("created_at",{ascending:false})
  if(search){const match=/^(?:O-)?(\d+)$/i.exec(search);const number=match?Number(match[1]):NaN;query=Number.isSafeInteger(number)?query.or(`number.eq.${number},customer_name.ilike.%${search}%`):query.ilike("customer_name",`%${search}%`)}
  if(params.status&&params.status in quoteLabels)query=query.eq("status",params.status)
  const {data:quotes,error,count}=await query.range((page-1)*25,page*25-1)
  if(error)return <EditorPageShell title="Offertes" description="Maak offertes en volg de reactie van uw klant."><p>Offertes zijn nog niet beschikbaar. Controleer de verbinding en de offerte-migratie.</p></EditorPageShell>
  const {data:selected}=params.quote?await db.from("quotes").select("id,number,request_id,business_id").eq("id",params.quote).maybeSingle():{data:null}
  const [{data:versions},{data:request},{data:businesses}]=await Promise.all([
    selected?db.from("quote_versions").select(versionColumns).eq("quote_id",selected.id).order("version",{ascending:false}):Promise.resolve({data:[]}),
    selected?db.from("contact_requests").select("id,name,email,service").eq("id",selected.request_id).single():Promise.resolve({data:null}),
    db.from("businesses").select("id,name,email,street,postal,city,request_portal_receipt_enabled"),
  ])
  const business=businesses?.find(b=>b.id===selected?.business_id)||businesses?.[0]
  const selectedVersions=(versions||[]) as unknown as QuoteVersion[]
  const initial:QuoteSnapshot={title:request?.service||"Offerte",terms:"",seller:{legal_name:business?.name||"",email:business?.email||"",address_line1:business?.street||"",postal_code:business?.postal||"",city:business?.city||"",country_code:"NL"},customer:{name:request?.name||"",email:request?.email||"",address_line1:"",postal_code:"",city:"",country_code:"NL"},lines:[],subtotalMinor:0,vatTotalMinor:0,totalMinor:0}
  const [{data:deliveries},{data:services},{data:entries}]=await Promise.all([
    selectedVersions.length?db.from("quote_deliveries").select("version_id,status,created_at").in("version_id",selectedVersions.map(v=>v.id)).order("created_at",{ascending:false}):Promise.resolve({data:[]}),
    selected?db.from("services").select("id,title").eq("business_id",selected.business_id):Promise.resolve({data:[]}),
    selected?db.from("calendar_entries").select("id,status,start_at").eq("contact_request_id",selected.request_id).eq("business_id",selected.business_id):Promise.resolve({data:[]}),
  ])
  const pageHref=(next:number)=>`/editor/quotes?${new URLSearchParams({q:search,status:params.status||"",page:String(next),...(selected?{quote:selected.id}:{})})}`
  return <EditorPageShell title="Offertes" description="Van aanvraag of afspraak naar offerte, klantakkoord en factuur." maxWidth="full">
    {!quoteWritesEnabled()?<p className="mb-4 rounded-lg bg-muted p-4">Nieuwe offerteacties zijn uitgeschakeld. Bestaande documenten blijven beschikbaar.</p>:null}
    {business?<ReceiptSetting key={business.id} businessId={business.id} initial={business.request_portal_receipt_enabled||false}/>:null}
    <form className="mb-5 flex flex-wrap gap-2"><input className="h-11 min-w-0 rounded-md border bg-background px-3" name="q" aria-label="Zoeken op klant of offertenummer" placeholder="Klant of nummer" defaultValue={params.q}/><select name="status" aria-label="Offertestatus" defaultValue={params.status||""} className="h-11 rounded-md border bg-background px-3"><option value="">Alle statussen</option>{Object.entries(quoteLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className="rounded-md border px-4">Zoeken</button></form>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><nav aria-label="Offertes" className="min-w-0 space-y-2">{quotes?.map(q=><Link key={q.id} href={`/editor/quotes?quote=${q.id}`} className={`block break-words rounded-xl border p-4 ${selected?.id===q.id?"border-primary bg-primary/5":"bg-card"}`}><strong>O-{q.number} · {q.customer_name||"Klant"}</strong><p className="text-sm text-muted-foreground">{quoteLabels[q.status as keyof typeof quoteLabels]||"Concept"}</p></Link>)}{!quotes?.length?<p>Geen offertes gevonden. Maak een offerte vanuit Aanvragen of Kalender.</p>:null}<div className="flex justify-between py-3 text-sm">{page>1?<Link href={pageHref(page-1)}>Vorige</Link>:<span/>}<span>{page} / {Math.max(1,Math.ceil((count||0)/25))}</span>{page*25<(count||0)?<Link href={pageHref(page+1)}>Volgende</Link>:<span/>}</div><Link className="block text-sm underline" href="/editor/requests">Naar aanvragen</Link></nav>
    {selected&&request?<QuoteEditor key={`${selected.id}-${request.email}-${selectedVersions.map(v=>v.revision).join("-")}`} quote={selected} request={request} versions={selectedVersions} initial={initial} deliveries={deliveries||[]} services={services||[]} entries={entries||[]}/>:<p className="rounded-xl border p-6 text-muted-foreground">Selecteer een offerte of maak er een vanuit een aanvraag of afspraak.</p>}</div>
  </EditorPageShell>
}
