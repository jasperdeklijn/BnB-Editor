"use client"

import { useState } from "react"
import { CalendarDays, CheckCircle2, Clock, FileDown, RefreshCw, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CustomerBookingView } from "@/lib/booking/customer-access"

const STATUS_LABELS = { pending: "In afwachting", confirmed: "Bevestigd", cancelled: "Geannuleerd", completed: "Afgerond" }

function localInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function rangeLabel(start: string, end: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short", timeZone: timezone })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

function moneyLabel(value: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(value / 100)
}

export function CustomerBookingClient({ initialBooking }: { initialBooking: CustomerBookingView }) {
  const [booking, setBooking] = useState(initialBooking)
  const [startAt, setStartAt] = useState(() => localInput(initialBooking.entry.start_at))
  const [endAt, setEndAt] = useState(() => localInput(initialBooking.entry.end_at))
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  const refresh = async () => {
    const response = await fetch(`/api/booking/manage/${encodeURIComponent(booking.token)}`, { cache: "no-store" })
    if (response.ok) setBooking(await response.json())
  }

  const act = async (body: Record<string, unknown>, success: string) => {
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(`/api/booking/manage/${encodeURIComponent(booking.token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "De actie is niet gelukt.")
      await refresh()
      setNotice({ tone: "success", text: success })
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "De actie is niet gelukt." })
    } finally {
      setBusy(false)
    }
  }

  const requestReschedule = () => {
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setNotice({ tone: "error", text: "Kies een geldige start- en eindtijd." })
      return
    }
    void act({ action: "request_reschedule", startAt: start.toISOString(), endAt: end.toISOString(), message }, "Uw verplaatsingsverzoek is verstuurd.")
  }

  const openAlternatives = booking.changeRequests.filter((request) => request.status === "pending" && request.requested_by === "owner")

  return (
    <main className="min-h-screen bg-[#f4f6f2] px-4 py-10 text-[#17332d] sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-3xl bg-[#17332d] p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">{booking.businessName}</p>
          <h1 className="mt-2 text-3xl font-bold">Uw boeking</h1>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            {booking.entry.status === "confirmed" ? <CheckCircle2 className="h-4 w-4" /> : booking.entry.status === "cancelled" ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {STATUS_LABELS[booking.entry.status]}
          </div>
        </header>

        {notice ? <div role="status" className={`rounded-2xl border p-4 text-sm ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.text}</div> : null}

        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#dfe9df] p-3"><CalendarDays className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-bold">{booking.serviceTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-black/65">{rangeLabel(booking.entry.start_at, booking.entry.end_at, booking.entry.timezone)}</p>
              <p className="mt-1 text-sm text-black/65">Voor {booking.entry.customer_name}</p>
            </div>
          </div>
        </section>

        {booking.financial ? (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">Reservering en facturen</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-black/55">Reserveringsnummer</dt><dd className="font-semibold">{booking.financial.reservationNumber}</dd></div>
              <div><dt className="text-black/55">Betaalstatus</dt><dd className="font-semibold">{{ open: "Open", paid: "Betaald", refunded: "Terugbetaald" }[booking.financial.settlementStatus]}</dd></div>
              <div><dt className="text-black/55">Totaal</dt><dd className="font-semibold">{moneyLabel(booking.financial.totalMinor, booking.financial.currency)}</dd></div>
            </dl>
            {booking.invoices.length > 0 ? (
              <div className="mt-5 grid gap-2">
                {booking.invoices.map((invoice) => (
                  <a key={invoice.id} className="flex min-h-11 items-center justify-between rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/[0.03]" href={`/api/booking/manage/${encodeURIComponent(booking.token)}/invoice?invoiceId=${encodeURIComponent(invoice.id)}`}>
                    <span>{invoice.documentType === "credit_note" ? "Creditfactuur" : "Factuur"} {invoice.invoiceNumber}<span className="ml-2 text-black/50">{moneyLabel(invoice.documentType === "credit_note" ? -invoice.totalMinor : invoice.totalMinor, invoice.currency)}</span></span>
                    <FileDown className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : <p className="mt-4 text-sm text-black/55">Er is nog geen uitgegeven factuur beschikbaar.</p>}
          </section>
        ) : null}

        {openAlternatives.map((proposal) => (
          <section key={proposal.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-bold">Alternatief tijdstip voorgesteld</h2>
            <p className="mt-2 text-sm">{rangeLabel(proposal.proposed_start_at, proposal.proposed_end_at, booking.entry.timezone)}</p>
            {proposal.customer_message ? <p className="mt-2 text-sm text-black/65">{proposal.customer_message}</p> : null}
            <Button className="mt-4 rounded-full" disabled={busy} onClick={() => act({ action: "accept_alternative", requestId: proposal.id }, "Het alternatieve tijdstip is geaccepteerd.")}>Voorstel accepteren</Button>
          </section>
        ))}

        {booking.canRequestReschedule ? (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">Verplaatsing aanvragen</h2>
            <p className="mt-2 text-sm text-black/60">Uw nieuwe voorkeur wordt eerst gecontroleerd en daarna ter beoordeling naar de ondernemer gestuurd.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="customer-booking-start">Nieuwe start</Label><Input id="customer-booking-start" className="mt-1.5" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></div>
              <div><Label htmlFor="customer-booking-end">Nieuw einde</Label><Input id="customer-booking-end" className="mt-1.5" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></div>
            </div>
            <div className="mt-4"><Label htmlFor="customer-booking-message">Toelichting</Label><Textarea id="customer-booking-message" className="mt-1.5" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} /></div>
            <Button variant="outline" className="mt-4 rounded-full" disabled={busy} onClick={requestReschedule}><RefreshCw className="h-4 w-4" />Verplaatsing aanvragen</Button>
          </section>
        ) : null}

        {booking.canCancel ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6">
            <h2 className="font-bold">Boeking annuleren</h2>
            <p className="mt-2 text-sm text-black/60">Deze actie annuleert de boeking direct. De ondernemer ontvangt een melding.</p>
            <Button variant="destructive" className="mt-4 rounded-full" disabled={busy} onClick={() => { if (window.confirm("Weet u zeker dat u deze boeking wilt annuleren?")) void act({ action: "cancel" }, "Uw boeking is geannuleerd.") }}>Boeking annuleren</Button>
          </section>
        ) : null}

        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Statusverloop</h2>
          <ol className="mt-5 space-y-4">
            {booking.history.map((item) => (
              <li key={item.id} className="border-l-2 border-[#b8cbbd] pl-4">
                <p className="font-semibold">{item.event_type.replaceAll("_", " ")}</p>
                {item.public_message ? <p className="mt-1 text-sm text-black/60">{item.public_message}</p> : null}
                <time className="mt-1 block text-xs text-black/45">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}
