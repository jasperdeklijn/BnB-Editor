"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TRANSFER_STATUSES, STATUS_HELP, type TransferDetail as Detail } from "@/lib/flexstart/shared"
import { CheckPanel } from "./check-panel"
import { PrepareDesign } from "./prepare-design"

const ImportPreviewFrame = dynamic(() => import("@/components/editor/import-preview-frame").then((m) => m.ImportPreviewFrame), { ssr: false })
const ImportDesign = dynamic(() => import("@/components/editor/import-design").then((m) => m.ImportDesign), { ssr: false })

export function TransferDetail({ detail, admin = false }: { detail: Detail; admin?: boolean }) {
  const { request: item, design, check, feedback } = detail
  const [message, setMessage] = useState("")
  const [notes, setNotes] = useState(detail.internalNotes || "")
  const [findings, setFindings] = useState(item.review_findings)
  const [mobile, setMobile] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [importing, setImporting] = useState(false)
  const [mobileReviewed, setMobileReviewed] = useState(false)
  const [testReceived, setTestReceived] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const router = useRouter()
  const reviewValid = !!check && item.reviewed_version === check.version
  const approvalValid = !!check && item.approved_version === check.version
  async function act(action: string, text = "") {
    setBusy(true); setNotice("")
    try {
      const response = await fetch(`/api/flexstart/${item.id}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revision: item.revision, message: text, version: check?.version, mobileReviewed, testReceived }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setNotice("Opgeslagen."); setMessage(""); router.refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : "Opslaan is mislukt.") }
    finally { setBusy(false) }
  }
  async function publish() {
    setBusy(true); setNotice("")
    try {
      const response = await fetch("/api/websites/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId: item.website_id, published: true }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setNotice("Je website is gepubliceerd."); router.refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : "Publiceren is mislukt.") }
    finally { setBusy(false) }
  }
  return <div className="min-w-0 space-y-6 [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:py-2">
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{item.business_name}</h2><span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">{TRANSFER_STATUSES[item.status]}</span></div>
      <p className="mt-2 text-sm text-muted-foreground">{STATUS_HELP[item.status]}</p>
      <p className="mt-2 text-xs text-muted-foreground">Aangevraagd op {new Date(item.created_at).toLocaleDateString("nl-NL")} · Gratis introductieaanbod</p>
      {item.status === "ready" && <p role="status" className="mt-4 rounded-xl bg-secondary p-4 text-sm font-medium">Je nieuwe ontwerp staat klaar. Bekijk beide websites en geef je akkoord of opmerkingen.</p>}
      <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Aangeleverde informatie</summary>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {[["Bronwebsite", item.source_url], ["Branche", item.business_type], ["Diensten", item.services], ["Plaats en werkgebied", `${item.city} — ${item.service_area}`], ["Doel", { calls: "Bellen", requests: "Aanvragen", bookings: "Boeken" }[item.primary_goal]], ["Uitstraling", item.appearance], ["Kleuren", item.preferred_colors], ["Behouden", item.preserve_notes], ["Opmerkingen", item.customer_notes]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="font-medium">{label}</dt><dd className="whitespace-pre-wrap break-words text-muted-foreground">{value || "Niet ingevuld"}</dd></div>)}
        </dl>
        {detail.logoUrl && <a href={detail.logoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-primary underline">Aangeleverd logo openen</a>}
        <p className="mt-3 text-xs text-muted-foreground">Toestemming voor overname bevestigd op {new Date(item.permission_confirmed_at).toLocaleDateString("nl-NL")}.</p>
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.refresh()} disabled={busy}>Status vernieuwen</Button>
        {!admin && item.website_id && <Button asChild variant="outline"><Link href={`/editor?websiteId=${item.website_id}`}>Concept zelf aanpassen</Link></Button>}
        {admin && item.status === "requested" && <Button disabled={busy} onClick={() => void act("start")}>In behandeling nemen</Button>}
        {admin && ["processing", "checking", "corrections"].includes(item.status) && <Button variant="outline" onClick={() => setImporting((v) => !v)}>{importing ? "Import sluiten" : "JSON importeren naar klantaccount"}</Button>}
      </div>
    </section>

    {admin && importing && <ImportDesign canCreate transfer={{ id: item.id, revision: item.revision, businessName: item.business_name }} />}
    {admin && check && ["checking", "corrections"].includes(item.status) && <PrepareDesign request={item} check={check} />}

    {design && <section className="space-y-3" aria-label="Oud en nieuw vergelijken">
      <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto text-lg font-semibold">Oud en nieuw vergelijken</h2><Button size="sm" variant={mobile ? "outline" : "default"} aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</Button><Button size="sm" variant={mobile ? "default" : "outline"} aria-pressed={mobile} onClick={() => setMobile(true)}>Mobiel</Button></div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 space-y-2 rounded-xl border bg-card p-3"><h3 className="font-medium">Bestaande website</h3>
          <p className="text-xs text-muted-foreground">Sommige websites blokkeren inladen. Open de bron dan in een nieuw tabblad. Laden maakt verbinding met de oorspronkelijke website.</p>
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-block break-all text-sm text-primary underline">Bronwebsite openen</a>
          {!showSource ? <div className="flex min-h-52 items-center justify-center rounded-lg bg-muted"><Button variant="outline" onClick={() => setShowSource(true)}>Bestaande website laden</Button></div> : <div className="overflow-x-auto rounded-lg border"><iframe title="Bestaande website" src={item.source_url} sandbox="allow-scripts" referrerPolicy="no-referrer" className="mx-auto block h-[680px] bg-white" style={{ width: mobile ? 375 : "100%", minWidth: mobile ? 375 : 768 }} /></div>}
        </div>
        <div className="min-w-0 space-y-2 rounded-xl border bg-card p-3"><h3 className="font-medium">Nieuw FlexPagina-concept</h3><p className="text-xs text-muted-foreground">Voorbeeld: formulieren versturen niets. Wijzigingen worden apart in de editor opgeslagen.</p><ImportPreviewFrame key={`${item.website_id}-${check?.version}`} design={design} mobile={mobile} /></div>
      </div>
    </section>}

    {!admin && ["ready", "approved"].includes(item.status) && <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Jouw beoordeling</h2><p className="text-sm text-muted-foreground">Goedkeuren zet niets live. Publicatie volgt na FlexCheck en persoonlijke FlexReview.</p>
      <Button disabled={busy || item.status !== "ready"} onClick={() => void act("approve")}>Concept goedkeuren</Button>
      <label className="block space-y-2 text-sm font-medium">Gewenste correcties<Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={6000} placeholder="Bundel je opmerkingen voor de inbegrepen correctieronde." /></label>
      <Button variant="outline" disabled={busy || !message.trim() || feedback.length > 0} onClick={() => void act("correct", message)}>Correctie aanvragen</Button>
      {feedback.length > 0 && <p className="text-xs text-muted-foreground">De inbegrepen correctieronde is gebruikt. Voor aanvullende hulp kun je contact opnemen met support.</p>}
    </section>}

    {feedback.length > 0 && <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6"><h2 className="text-lg font-semibold">Correcties</h2>{feedback.map((entry) => <article key={entry.id} className="rounded-xl border p-3"><p className="whitespace-pre-wrap break-words text-sm">{entry.message}</p><p className="mt-2 text-xs text-muted-foreground">{entry.resolved_at ? "Verwerkt" : "Open"} · {new Date(entry.created_at).toLocaleDateString("nl-NL")}</p></article>)}</section>}

    {check && item.website_id && <CheckPanel check={check} websiteId={item.website_id} admin={admin} />}

    {item.website_id && <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"><h2 className="text-lg font-semibold">FlexReview en livegang</h2>
      <p className="text-sm text-muted-foreground">{reviewValid ? "FlexPagina heeft dit concept persoonlijk gecontroleerd." : item.review_requested_at ? "Je persoonlijke controle is aangevraagd." : "Vraag persoonlijke controle aan nadat je het concept hebt bekeken."}</p>
      {item.review_findings && <div className="rounded-xl bg-muted p-3"><p className="text-sm font-medium">Bevindingen {reviewValid ? "voor dit concept" : "van de vorige controle"}</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.review_findings}</p></div>}
      {!admin && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !["ready", "approved", "checking"].includes(item.status)} onClick={() => void act("request_review")}>Persoonlijke review aanvragen</Button>
        <Button asChild variant="outline"><Link href={`/editor/domains?websiteId=${item.website_id}`}>Domein koppelen en controleren</Link></Button>
        <Button disabled={busy || item.status !== "approved" || !approvalValid || !reviewValid || !check?.canPublish} onClick={() => void publish()}>Goedgekeurde website publiceren</Button>
      </div>}
      <p className="text-xs text-muted-foreground">Wijzigingen aan het concept maken eerdere goedkeuringen ongeldig. Je bestaande live website wordt niet automatisch vervangen. Schakel die pas uit wanneer je nieuwe concept volledig klaar is.</p>
      {admin && <div className="space-y-3">
        <label className="block space-y-2 text-sm font-medium">Bevindingen voor de klant<Textarea value={findings} onChange={(e) => setFindings(e.target.value)} maxLength={6000} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={mobileReviewed} onChange={(e) => setMobileReviewed(e.target.checked)} className="mt-1" />Ik heb mobielbeeld, inhoud, contactgegevens, knoppen en privacylink persoonlijk gecontroleerd.</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={testReceived} onChange={(e) => setTestReceived(e.target.checked)} className="mt-1" />De klant heeft ontvangst van de testaanvraag bevestigd.</label>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !findings.trim() || !mobileReviewed || !testReceived || !check?.canPublish || !["checking", "ready", "approved"].includes(item.status)} onClick={() => void act("review", findings)}>FlexReview goedkeuren</Button>
          {["checking", "corrections"].includes(item.status) && <Button variant="outline" disabled={busy} onClick={() => void act(item.status === "corrections" || feedback.some((f) => !f.resolved_at) ? "resolve" : "ready")}>{feedback.some((f) => !f.resolved_at) ? "Correcties verwerkt — klaar voor klant" : "Klaar voor klant"}</Button>}</div>
      </div>}
    </section>}
    {admin && <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6"><label className="block space-y-2 font-medium">Interne notities — alleen beheer<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={6000} /></label><Button variant="outline" disabled={busy} onClick={() => void act("notes", notes)}>Notities opslaan</Button></section>}
    {notice && <p role="status" className="sticky bottom-3 rounded-xl border bg-card p-4 text-sm shadow-lg">{notice}</p>}
  </div>
}
