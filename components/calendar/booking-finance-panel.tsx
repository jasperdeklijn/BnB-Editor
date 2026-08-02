"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { CreditCard, Download, FilePlus2, Mail, Plus, ReceiptText, Save, Trash2, X } from "lucide-react"

import {
  createBookingInvoiceDraftAction,
  createFullCreditNoteAction,
  emailBookingInvoiceAction,
  issueBookingInvoiceAction,
  saveBookingInvoiceDraftAction,
  saveReservationPricingAction,
  setReservationSettlementStatusAction,
  voidBookingInvoiceAction,
} from "@/app/editor/calendar/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import type {
  BookingInvoice,
  BookingInvoiceProfile,
  ReservationFinancial,
  SettlementStatus,
} from "@/lib/booking/invoicing"
import {
  calculateBookingFinancials,
  formatMinorUnits,
  parseServicePriceMinor,
  type BookingFinancialLine,
  type InvoiceParty,
} from "@/lib/booking/pricing"
import type { CalendarEntry } from "@/lib/supabase/calendar"
import type { Service } from "@/lib/supabase/services"

type EditableLine = Partial<BookingFinancialLine> & { id: string }

const EMPTY_PARTY: InvoiceParty = {
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country_code: "NL",
}

function lineFromService(service?: Service): EditableLine {
  return {
    id: crypto.randomUUID(), description: service?.title || "Reservering", quantity_milli: 1000,
    unit_price_minor: parseServicePriceMinor(service?.price || ""), discount_minor: 0, vat_rate_basis_points: 0,
  }
}

function partyValue(party: InvoiceParty, key: keyof InvoiceParty) {
  return String(party[key] || "")
}

function LineEditor({ lines, onChange, disabled }: { lines: EditableLine[]; onChange: (lines: EditableLine[]) => void; disabled: boolean }) {
  const update = (index: number, values: Partial<EditableLine>) => onChange(lines.map((line, current) => current === index ? { ...line, ...values } : line))
  return (
    <div className="grid gap-3">
      {lines.map((line, index) => (
        <div key={line.id} className="grid gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Regel {index + 1}</span>
            <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" disabled={disabled || lines.length === 1} onClick={() => onChange(lines.filter((_, current) => current !== index))} aria-label={`Regel ${index + 1} verwijderen`}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div><Label htmlFor={`invoice-line-description-${line.id}`}>Omschrijving</Label><Input id={`invoice-line-description-${line.id}`} className="mt-1" value={line.description || ""} maxLength={200} disabled={disabled} onChange={(event) => update(index, { description: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor={`invoice-line-quantity-${line.id}`}>Aantal</Label><Input id={`invoice-line-quantity-${line.id}`} className="mt-1" type="number" min="0.001" step="0.001" value={(Number(line.quantity_milli || 0) / 1000).toString()} disabled={disabled} onChange={(event) => update(index, { quantity_milli: Math.round(Number(event.target.value) * 1000) })} /></div>
            <div><Label htmlFor={`invoice-line-price-${line.id}`}>Prijs excl. btw</Label><Input id={`invoice-line-price-${line.id}`} className="mt-1" type="number" min="0" step="0.01" value={(Number(line.unit_price_minor || 0) / 100).toFixed(2)} disabled={disabled} onChange={(event) => update(index, { unit_price_minor: Math.round(Number(event.target.value) * 100) })} /></div>
            <div><Label htmlFor={`invoice-line-discount-${line.id}`}>Korting</Label><Input id={`invoice-line-discount-${line.id}`} className="mt-1" type="number" min="0" step="0.01" value={(Number(line.discount_minor || 0) / 100).toFixed(2)} disabled={disabled} onChange={(event) => update(index, { discount_minor: Math.round(Number(event.target.value) * 100) })} /></div>
            <div><Label htmlFor={`invoice-line-vat-${line.id}`}>Btw %</Label><Input id={`invoice-line-vat-${line.id}`} className="mt-1" type="number" min="0" max="100" step="0.01" value={(Number(line.vat_rate_basis_points || 0) / 100).toString()} disabled={disabled} onChange={(event) => update(index, { vat_rate_basis_points: Math.round(Number(event.target.value) * 100) })} /></div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="min-h-11" disabled={disabled || lines.length >= 100} onClick={() => onChange([...lines, { id: crypto.randomUUID(), description: "", quantity_milli: 1000, unit_price_minor: 0, discount_minor: 0, vat_rate_basis_points: 0 }])}><Plus className="h-4 w-4" /> Regel toevoegen</Button>
    </div>
  )
}

function PartyEditor({ prefix, title, party, seller, disabled, onChange }: { prefix: string; title: string; party: InvoiceParty; seller?: boolean; disabled: boolean; onChange: (party: InvoiceParty) => void }) {
  const field = (key: keyof InvoiceParty, value: string) => onChange({ ...party, [key]: value })
  return (
    <fieldset className="grid gap-2 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div><Label htmlFor={`${prefix}-name`}>{seller ? "Juridische/handelsnaam" : "Naam"}</Label><Input id={`${prefix}-name`} className="mt-1" value={partyValue(party, seller ? "legal_name" : "name")} disabled={disabled} onChange={(event) => field(seller ? "legal_name" : "name", event.target.value)} /></div>
      <div><Label htmlFor={`${prefix}-address`}>Adres</Label><Input id={`${prefix}-address`} className="mt-1" value={party.address_line1 || ""} disabled={disabled} onChange={(event) => field("address_line1", event.target.value)} /></div>
      <div><Label htmlFor={`${prefix}-address2`}>Adresregel 2</Label><Input id={`${prefix}-address2`} className="mt-1" value={party.address_line2 || ""} disabled={disabled} onChange={(event) => field("address_line2", event.target.value)} /></div>
      <div className="grid grid-cols-[0.8fr_1.2fr] gap-2"><div><Label htmlFor={`${prefix}-postal`}>Postcode</Label><Input id={`${prefix}-postal`} className="mt-1" value={party.postal_code || ""} disabled={disabled} onChange={(event) => field("postal_code", event.target.value)} /></div><div><Label htmlFor={`${prefix}-city`}>Plaats</Label><Input id={`${prefix}-city`} className="mt-1" value={party.city || ""} disabled={disabled} onChange={(event) => field("city", event.target.value)} /></div></div>
      <div><Label htmlFor={`${prefix}-country`}>Landcode</Label><Input id={`${prefix}-country`} className="mt-1" value={party.country_code || "NL"} maxLength={2} disabled={disabled} onChange={(event) => field("country_code", event.target.value.toUpperCase())} /></div>
      <div><Label htmlFor={`${prefix}-email`}>E-mail</Label><Input id={`${prefix}-email`} className="mt-1" type="email" value={party.email || ""} disabled={disabled} onChange={(event) => field("email", event.target.value)} /></div>
      {seller ? <><div><Label htmlFor={`${prefix}-vat`}>Btw-id</Label><Input id={`${prefix}-vat`} className="mt-1" value={party.vat_id || ""} disabled={disabled} onChange={(event) => field("vat_id", event.target.value)} /></div><div><Label htmlFor={`${prefix}-kvk`}>KvK-nummer</Label><Input id={`${prefix}-kvk`} className="mt-1" value={party.kvk_number || ""} disabled={disabled} onChange={(event) => field("kvk_number", event.target.value)} /></div><div><Label htmlFor={`${prefix}-iban`}>IBAN (optioneel)</Label><Input id={`${prefix}-iban`} className="mt-1" value={party.iban || ""} disabled={disabled} onChange={(event) => field("iban", event.target.value)} /></div></> : null}
    </fieldset>
  )
}

export function BookingFinancePanel({
  entry,
  offering,
  financial,
  invoices,
  profile: initialProfile,
  unavailable,
  onFinancialChange,
  onInvoicesChange,
}: {
  entry: CalendarEntry
  offering?: Service
  financial: ReservationFinancial | null
  invoices: BookingInvoice[]
  profile: BookingInvoiceProfile
  unavailable: boolean
  onFinancialChange: (financial: ReservationFinancial) => void
  onInvoicesChange: (invoices: BookingInvoice[]) => void
}) {
  const [lines, setLines] = useState<EditableLine[]>(financial?.line_items.length ? financial.line_items : [lineFromService(offering)])
  const [profile, setProfile] = useState(initialProfile)
  const [draft, setDraft] = useState<BookingInvoice | null>(() => invoices.find((invoice) => invoice.status === "draft" && invoice.document_type === "invoice") ?? null)
  const [seller, setSeller] = useState<InvoiceParty>(draft?.seller_details || { ...EMPTY_PARTY })
  const [customer, setCustomer] = useState<InvoiceParty>(draft?.customer_details || { ...EMPTY_PARTY })
  const [draftLines, setDraftLines] = useState<EditableLine[]>(draft?.line_items || [])
  const [serviceDate, setServiceDate] = useState(draft?.service_date || "")
  const [dueDate, setDueDate] = useState(draft?.due_date || "")
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [invoiceEditorOpen, setInvoiceEditorOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setLines(financial?.line_items.length ? financial.line_items : [lineFromService(offering)])
  }, [entry.id, financial, offering])
  useEffect(() => {
    setProfile(initialProfile)
  }, [initialProfile])
  useEffect(() => {
    const nextDraft = invoices.find((invoice) => invoice.status === "draft" && invoice.document_type === "invoice") ?? null
    setDraft(nextDraft)
    if (nextDraft) {
      setSeller(nextDraft.seller_details); setCustomer(nextDraft.customer_details); setDraftLines(nextDraft.line_items)
      setServiceDate(nextDraft.service_date); setDueDate(nextDraft.due_date)
    }
  }, [entry.id, invoices])
  useEffect(() => {
    setInvoiceEditorOpen(false)
  }, [entry.id])
  useEffect(() => {
    if (!invoiceEditorOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) setInvoiceEditorOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [invoiceEditorOpen, isPending])

  const previewTotals = useMemo(() => {
    try { return calculateBookingFinancials(lines) } catch { return null }
  }, [lines])
  const draftTotals = useMemo(() => {
    try { return draftLines.length ? calculateBookingFinancials(draftLines) : null } catch { return null }
  }, [draftLines])

  const replaceInvoice = (invoice: BookingInvoice) => onInvoicesChange([invoice, ...invoices.filter((current) => current.id !== invoice.id)])

  const savePricing = () => startTransition(async () => {
    const result = await saveReservationPricingAction(entry.id, lines)
    if (!result.success) return setNotice({ tone: "error", text: result.error })
    onFinancialChange(result.financial); setNotice({ tone: "success", text: "Reserveringsprijs opgeslagen." })
  })

  const updateSettlement = (status: SettlementStatus) => startTransition(async () => {
    const result = await setReservationSettlementStatusAction(entry.id, status)
    if (!result.success) return setNotice({ tone: "error", text: result.error })
    onFinancialChange(result.financial); setNotice({ tone: "success", text: "Betaalstatus handmatig bijgewerkt." })
  })

  const createDraft = () => startTransition(async () => {
    const result = await createBookingInvoiceDraftAction(entry.id)
    if (!result.success) return setNotice({ tone: "error", text: result.error })
    replaceInvoice(result.invoice); setDraft(result.invoice); setInvoiceEditorOpen(true); setNotice({ tone: "success", text: "Conceptfactuur aangemaakt." })
  })

  const persistDraft = async () => {
    if (!draft) throw new Error("Conceptfactuur ontbreekt.")
    const result = await saveBookingInvoiceDraftAction(draft.id, { seller, customer, lines: draftLines, serviceDate, dueDate, profile })
    if (!result.success) throw new Error(result.error)
    replaceInvoice(result.invoice); setDraft(result.invoice)
    return result.invoice
  }

  const saveDraft = () => startTransition(async () => {
    try { await persistDraft(); setNotice({ tone: "success", text: "Conceptfactuur opgeslagen." }) }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Opslaan mislukt." }) }
  })

  const issueDraft = () => startTransition(async () => {
    if (!draft || !window.confirm("Factuur uitgeven? Nummer, bedragen en PDF worden daarna definitief en kunnen niet meer worden gewijzigd.")) return
    try {
      const saved = await persistDraft()
      const result = await issueBookingInvoiceAction(saved.id)
      if (!result.success) throw new Error(result.error)
      replaceInvoice(result.invoice); setDraft(null); setInvoiceEditorOpen(false); setNotice({ tone: "success", text: `Factuur ${result.invoice.invoice_number} definitief uitgegeven.` })
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Uitgeven mislukt." }) }
  })

  const emailInvoice = (invoice: BookingInvoice) => startTransition(async () => {
    if (!window.confirm(`Factuur ${invoice.invoice_number} nu als PDF-bijlage naar ${invoice.customer_details.email || "de klant"} sturen?`)) return
    const result = await emailBookingInvoiceAction(invoice.id)
    if (!result.success) return setNotice({ tone: "error", text: result.error })
    replaceInvoice({ ...invoice, emailed_at: new Date().toISOString() }); setNotice({ tone: "success", text: `Factuur verzonden naar ${result.delivery.recipient}.` })
  })

  const creditInvoice = (invoice: BookingInvoice) => startTransition(async () => {
    if (!window.confirm(`Een volledige creditfactuur maken voor ${invoice.invoice_number}? De oorspronkelijke factuur blijft bewaard.`)) return
    const result = await createFullCreditNoteAction(invoice.id)
    if (!result.success) return setNotice({ tone: "error", text: result.error })
    onInvoicesChange([result.invoice, ...invoices.map((current) => current.id === invoice.id ? { ...current, status: "credited" as const } : current)])
    setNotice({ tone: "success", text: `Creditfactuur ${result.invoice.invoice_number} uitgegeven.` })
  })

  const voidInvoice = (invoice: BookingInvoice) => startTransition(async () => {
    const reason = window.prompt("Waarom wordt deze nog niet geleverde factuur ongeldig gemaakt?")
    if (!reason) return
    const result = await voidBookingInvoiceAction(invoice.id, reason)
    if (!result.success) return setNotice({ tone: "error", text: result.error })
    replaceInvoice(result.invoice); setNotice({ tone: "success", text: "Factuur ongeldig gemaakt; nummer en PDF blijven bewaard." })
  })

  if (unavailable) return <StatusMessage tone="error">Voer eerst de Phase 5-factuurmigratie uit.</StatusMessage>
  if (!financial) return <StatusMessage tone="error">Het reserveringsnummer wordt aangemaakt zodra deze online boeking is bevestigd.</StatusMessage>

  const invoiceEditor = draft && invoiceEditorOpen && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[1000] flex h-[100dvh] flex-col overflow-hidden bg-background" role="dialog" aria-modal="true" aria-labelledby="invoice-editor-title">
          <header className="shrink-0 border-b border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-primary"><ReceiptText className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wide">Conceptfactuur</span></div>
                <h2 id="invoice-editor-title" className="mt-0.5 truncate text-xl font-semibold">Factuur voor {entry.customer_name || "klant"}</h2>
                <p className="truncate text-xs text-muted-foreground">Reservering {financial.reservation_number} · {entry.title}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setInvoiceEditorOpen(false)} disabled={isPending} aria-label="Factuur sluiten"><X className="h-5 w-5" /></Button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
              <div className="grid content-start gap-5">
                {notice ? <StatusMessage tone={notice.tone}>{notice.text}</StatusMessage> : null}
                <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4"><h3 className="font-semibold">Factuurregels</h3><p className="text-xs text-muted-foreground">Controleer de omschrijving, aantallen, prijs, korting en btw.</p></div>
                  <LineEditor lines={draftLines} onChange={setDraftLines} disabled={isPending} />
                </section>
                <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4"><h3 className="font-semibold">Factuurgegevens</h3><p className="text-xs text-muted-foreground">Deze gegevens worden vastgelegd zodra de factuur definitief wordt uitgegeven.</p></div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <PartyEditor prefix={`seller-${draft.id}`} title="Verkoper" seller party={seller} onChange={setSeller} disabled={isPending} />
                    <PartyEditor prefix={`customer-${draft.id}`} title="Klant" party={customer} onChange={setCustomer} disabled={isPending} />
                  </div>
                </section>
              </div>

              <aside className="grid content-start gap-5">
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Concepttotaal</p>
                  <p className="mt-1 text-3xl font-semibold">{formatMinorUnits(draftTotals?.totalMinor ?? 0)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Er wordt geen betaling via FlexPagina verwerkt.</p>
                </section>
                <section className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div><h3 className="font-semibold">Datums en nummering</h3><p className="text-xs text-muted-foreground">Stel de leverdatum, betaaltermijn en factuurreeksen in.</p></div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><div><Label htmlFor={`service-date-${draft.id}`}>Leverdatum</Label><Input id={`service-date-${draft.id}`} className="mt-1" type="date" value={serviceDate} disabled={isPending} onChange={(event) => setServiceDate(event.target.value)} /></div><div><Label htmlFor={`due-date-${draft.id}`}>Vervaldatum</Label><Input id={`due-date-${draft.id}`} className="mt-1" type="date" value={dueDate} disabled={isPending} onChange={(event) => setDueDate(event.target.value)} /></div></div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><div><Label htmlFor={`invoice-prefix-${draft.id}`}>Factuurreeks</Label><Input id={`invoice-prefix-${draft.id}`} className="mt-1" value={profile.invoice_prefix} maxLength={12} disabled={isPending} onChange={(event) => setProfile({ ...profile, invoice_prefix: event.target.value })} /></div><div><Label htmlFor={`credit-prefix-${draft.id}`}>Creditreeks</Label><Input id={`credit-prefix-${draft.id}`} className="mt-1" value={profile.credit_note_prefix} maxLength={12} disabled={isPending} onChange={(event) => setProfile({ ...profile, credit_note_prefix: event.target.value })} /></div></div>
                  <div><Label htmlFor={`payment-term-${draft.id}`}>Standaard betaaltermijn (dagen)</Label><Input id={`payment-term-${draft.id}`} className="mt-1" type="number" min="0" max="365" value={profile.payment_term_days} disabled={isPending} onChange={(event) => setProfile({ ...profile, payment_term_days: Number(event.target.value) })} /></div>
                  <div><Label htmlFor={`invoice-accent-${draft.id}`}>PDF-kleur</Label><Input id={`invoice-accent-${draft.id}`} className="mt-1 h-11" type="color" value={profile.accent_color} disabled={isPending} onChange={(event) => setProfile({ ...profile, accent_color: event.target.value })} /></div>
                </section>
                <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">We genereren een volledige Nederlandse factuur. Controleer bij buitenlandse, vrijgestelde of bijzondere btw-situaties eerst uw adviseur.</p>
              </aside>
            </div>
          </main>

          <footer className="shrink-0 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] backdrop-blur sm:px-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" className="min-h-11 sm:min-w-32" onClick={() => setInvoiceEditorOpen(false)} disabled={isPending}>Sluiten</Button>
              <div className="grid gap-2 sm:flex"><Button type="button" variant="outline" className="min-h-11 sm:min-w-44" onClick={saveDraft} disabled={isPending || !draftTotals}><Save className="h-4 w-4" /> Concept opslaan</Button><Button type="button" className="min-h-11 sm:min-w-44" onClick={issueDraft} disabled={isPending || !draftTotals}><ReceiptText className="h-4 w-4" /> Definitief uitgeven</Button></div>
            </div>
          </footer>
        </div>,
        document.body,
      )
    : null

  return (
    <>
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3"><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-primary" /><h2 className="font-semibold">Prijs en factuur</h2></div><p className="mt-1 text-xs text-muted-foreground">Reservering {financial.reservation_number}. FlexPagina verwerkt geen betaling.</p></div>
      <div className="grid gap-4 p-4">
        {notice ? <StatusMessage tone={notice.tone}>{notice.text}</StatusMessage> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div><Label htmlFor={`settlement-${entry.id}`}>Handmatige betaalstatus</Label><select id={`settlement-${entry.id}`} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={financial.settlement_status} disabled={isPending} onChange={(event) => updateSettlement(event.target.value as SettlementStatus)}><option value="open">Open</option><option value="paid">Betaald</option><option value="refunded">Terugbetaald</option></select></div>
          <div className="rounded-md bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Reserveringstotaal</p><p className="text-lg font-semibold">{formatMinorUnits(previewTotals?.totalMinor ?? financial.total_minor)}</p></div>
        </div>

        <details className="rounded-md border border-border p-3" open={financial.pricing_status !== "ready"}>
          <summary className="cursor-pointer text-sm font-semibold">Reserveringsprijs bewerken</summary>
          <div className="mt-3 grid gap-3"><LineEditor lines={lines} onChange={setLines} disabled={isPending} /><Button type="button" className="min-h-11" onClick={savePricing} disabled={isPending || !previewTotals}><Save className="h-4 w-4" /> Prijs vastleggen</Button></div>
        </details>

        {!draft ? <Button type="button" variant="outline" className="min-h-11" onClick={createDraft} disabled={isPending || financial.pricing_status !== "ready"}><FilePlus2 className="h-4 w-4" /> Conceptfactuur maken</Button> : (
          <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Conceptfactuur klaar om te bewerken</p><p className="text-xs text-muted-foreground">Totaal {formatMinorUnits(draftTotals?.totalMinor ?? draft.total_minor)}</p></div><Button type="button" className="min-h-11" onClick={() => setInvoiceEditorOpen(true)} disabled={isPending}><ReceiptText className="h-4 w-4" /> Conceptfactuur openen</Button></div>
          </div>
        )}

        {invoices.filter((invoice) => invoice.status !== "draft").map((invoice) => (
          <article key={invoice.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{invoice.document_type === "credit_note" ? "Creditfactuur" : "Factuur"} {invoice.invoice_number}</p><p className="text-xs text-muted-foreground">{invoice.status === "credited" ? "Gecrediteerd" : invoice.status === "void" ? "Ongeldig" : "Uitgegeven"} · {formatMinorUnits(invoice.document_type === "credit_note" ? -invoice.total_minor : invoice.total_minor, invoice.currency)}</p></div>{invoice.emailed_at ? <span className="text-xs text-emerald-700">Verzonden</span> : null}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="min-h-11"><a href={`/api/booking/invoices/${invoice.id}/pdf`}><Download className="h-4 w-4" /> PDF</a></Button>
              {invoice.status !== "void" ? <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={isPending} onClick={() => emailInvoice(invoice)}><Mail className="h-4 w-4" /> E-mailen</Button> : null}
              {invoice.document_type === "invoice" && invoice.status === "issued" ? <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={isPending} onClick={() => creditInvoice(invoice)}><CreditCard className="h-4 w-4" /> Volledig crediteren</Button> : null}
              {invoice.document_type === "invoice" && invoice.status === "issued" && !invoice.emailed_at && !invoice.first_downloaded_at ? <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive" disabled={isPending} onClick={() => voidInvoice(invoice)}>Ongeldig maken</Button> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
    {invoiceEditor}
    </>
  )
}
