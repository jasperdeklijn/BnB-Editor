"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Clock3, Mail, MessageSquareText, Search, Send, UserRound } from "lucide-react"

import { saveInquiryReplyTemplateAction, sendInquiryReplyAction, updateInquiryAction } from "@/app/editor/requests/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import { Textarea } from "@/components/ui/textarea"
import type {
  InquiryDetail,
  InquiryFilters,
  InquiryListItem,
  InquiryOverview,
  InquiryReplyTemplate,
  InquiryStatus,
} from "@/lib/inquiries"

const INQUIRY_STATUSES = ["new", "in_progress", "awaiting_customer", "won", "lost", "spam", "archived"] as const

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "Nieuw",
  in_progress: "In behandeling",
  awaiting_customer: "Wacht op klant",
  won: "Gewonnen",
  lost: "Verloren",
  spam: "Spam",
  archived: "Archief",
}

const REQUEST_TYPE_LABELS: Record<InquiryListItem["request_type"], string> = {
  contact: "Contact",
  quote: "Offerte",
  appointment: "Afspraak",
  booking_request: "Boeking",
  whatsapp: "WhatsApp",
}

const SOURCE_LABELS: Record<string, string> = {
  website_form: "Websiteformulier",
  contact_request: "Websiteformulier",
  request_form_section: "Aanvraagformulier",
  contact_section: "Contactformulier",
  services_booking_space: "Dienstenblok",
}

const STATUS_TONES: Record<InquiryStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-900",
  awaiting_customer: "bg-violet-100 text-violet-900",
  won: "bg-emerald-100 text-emerald-900",
  lost: "bg-rose-100 text-rose-900",
  spam: "bg-zinc-200 text-zinc-700",
  archived: "bg-zinc-100 text-zinc-600",
}

function formatDate(value: string | null | undefined, withTime = true) {
  if (!value) return "—"
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date)
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function applyReplyTemplate(value: string, inquiry: InquiryDetail["inquiry"]) {
  return value
    .replaceAll("{{name}}", inquiry.name)
    .replaceAll("{{service}}", inquiry.service)
    .replaceAll("{{preferred_date}}", inquiry.preferred_date)
}

function toQuery(filters: Required<InquiryFilters>, requestId?: string | null) {
  const params = new URLSearchParams()
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.requestType !== "all") params.set("type", filters.requestType)
  if (filters.search) params.set("q", filters.search)
  if (filters.service) params.set("service", filters.service)
  if (filters.source !== "all") params.set("source", filters.source)
  if (filters.dateFrom) params.set("from", filters.dateFrom)
  if (filters.dateTo) params.set("to", filters.dateTo)
  if (filters.dueOnly) params.set("due", "1")
  if (filters.page > 1) params.set("page", String(filters.page))
  if (requestId) params.set("request", requestId)
  const search = params.toString()
  return search ? `/editor/requests?${search}` : "/editor/requests"
}

export function RequestsClient({
  businessId,
  overview,
  filters,
  selected,
  replyTemplates,
  schemaError,
  detailError,
}: {
  businessId: string
  overview: InquiryOverview
  filters: Required<InquiryFilters>
  selected: InquiryDetail | null
  replyTemplates: InquiryReplyTemplate[]
  schemaError: string | null
  detailError: string | null
}) {
  const router = useRouter()
  const [search, setSearch] = useState(filters.search)
  const [service, setService] = useState(filters.service)
  const [dateFrom, setDateFrom] = useState(filters.dateFrom)
  const [dateTo, setDateTo] = useState(filters.dateTo)

  useEffect(() => setSearch(filters.search), [filters.search])
  useEffect(() => setService(filters.service), [filters.service])
  useEffect(() => setDateFrom(filters.dateFrom), [filters.dateFrom])
  useEffect(() => setDateTo(filters.dateTo), [filters.dateTo])

  function navigate(next: Partial<Required<InquiryFilters>>, requestId?: string | null) {
    router.push(toQuery({ ...filters, ...next, page: next.page ?? 1 }, requestId))
  }

  const summary = [
    { status: "new" as const, label: "Nieuw", count: overview.counts.new },
    { status: "in_progress" as const, label: "In behandeling", count: overview.counts.in_progress },
    { status: "awaiting_customer" as const, label: "Wacht op klant", count: overview.counts.awaiting_customer },
    { status: "won" as const, label: "Gewonnen", count: overview.counts.won },
    { status: "lost" as const, label: "Verloren", count: overview.counts.lost },
  ]

  return (
    <div className="grid gap-4 sm:gap-5">
      {schemaError ? <StatusMessage tone="error">{schemaError}</StatusMessage> : null}
      <section aria-label="Overzicht aanvragen" className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {summary.map((item) => (
          <button
            key={item.status}
            type="button"
            onClick={() => navigate({ status: filters.status === item.status ? "all" : item.status })}
            className={`rounded-xl border p-3 text-left transition-colors ${filters.status === item.status ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
          >
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <strong className="mt-1 block text-2xl">{item.count}</strong>
          </button>
        ))}
      </section>

      {overview.followUpDue ? (
        <button type="button" onClick={() => navigate({ dueOnly: !filters.dueOnly })} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950">
          <Clock3 className="h-4 w-4" />
          {overview.followUpDue} {overview.followUpDue === 1 ? "opvolgmoment is" : "opvolgmomenten zijn"} nu verschuldigd.
        </button>
      ) : null}

      <form className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={(event) => { event.preventDefault(); navigate({ search, service, dateFrom, dateTo, page: 1 }) }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Zoek naam, e-mail, telefoon of aanbod" aria-label="Zoek aanvragen" />
        </div>
        <select value={filters.status} onChange={(event) => navigate({ status: event.target.value as Required<InquiryFilters>["status"] })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Alle statussen</option>
          {INQUIRY_STATUSES.map((status) => <option key={status} value={status}>{INQUIRY_STATUS_LABELS[status]}</option>)}
        </select>
        <select value={filters.requestType} onChange={(event) => navigate({ requestType: event.target.value as Required<InquiryFilters>["requestType"] })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Alle types</option>
          {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          <Input value={service} onChange={(event) => setService(event.target.value)} placeholder="Exact aanbod" aria-label="Filter op aanbod" />
          <select value={filters.source} onChange={(event) => navigate({ source: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter op bron">
            <option value="all">Alle bronnen</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Vanaf datum" />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Tot en met datum" />
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <section className="overflow-hidden rounded-xl border bg-card" aria-label="Aanvragenlijst">
          {overview.items.length ? (
            <ul className="divide-y">
              {overview.items.map((item) => <InquiryRow key={item.id} item={item} active={selected?.inquiry.id === item.id} href={toQuery(filters, item.id)} />)}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">Nog geen aanvragen voor deze selectie.</div>
          )}
          {overview.pageCount > 1 ? (
            <div className="flex items-center justify-between border-t p-3 text-sm">
              <span>Pagina {overview.page} van {overview.pageCount}</span>
              <div className="flex gap-2"><Button variant="outline" size="sm" disabled={overview.page <= 1} onClick={() => navigate({ page: overview.page - 1 })}>Vorige</Button><Button variant="outline" size="sm" disabled={overview.page >= overview.pageCount} onClick={() => navigate({ page: overview.page + 1 })}>Volgende</Button></div>
            </div>
          ) : null}
        </section>
        <InquiryDetailPanel businessId={businessId} detail={selected} replyTemplates={replyTemplates} detailError={detailError} />
      </div>
    </div>
  )
}

function InquiryRow({ item, href, active }: { item: InquiryListItem; href: string; active: boolean }) {
  return (
    <li>
      <Link href={href} className={`block p-4 transition-colors hover:bg-muted/60 ${active ? "bg-primary/5" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate font-semibold">{item.name || "Naam onbekend"}</p><p className="truncate text-sm text-muted-foreground">{item.email || item.phone || "Geen contactgegevens"}</p></div>
          <StatusBadge status={item.status} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{REQUEST_TYPE_LABELS[item.request_type]}</span><span>{SOURCE_LABELS[item.source] ?? item.source}</span>{item.service ? <span>{item.service}</span> : null}{item.preferred_date ? <span>{item.preferred_date}</span> : null}<span>{formatDate(item.last_activity_at)}</span></div>
        {item.follow_up_at ? <p className="mt-2 flex items-center gap-1 text-xs text-amber-800"><Clock3 className="h-3.5 w-3.5" />Opvolgen: {formatDate(item.follow_up_at)}</p> : null}
      </Link>
    </li>
  )
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONES[status]}`}>{INQUIRY_STATUS_LABELS[status]}</span>
}

function InquiryDetailPanel({ businessId, detail, replyTemplates, detailError }: { businessId: string; detail: InquiryDetail | null; replyTemplates: InquiryReplyTemplate[]; detailError: string | null }) {
  const router = useRouter()
  const [active, setActive] = useState<InquiryDetail | null>(detail)
  const [isPending, startTransition] = useTransition()
  const sendKey = useRef("")
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [reply, setReply] = useState({ subject: "", body: "" })
  const [templates, setTemplates] = useState(replyTemplates)
  const [templateName, setTemplateName] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    setActive(detail)
    setNotice(null)
    setReply({ subject: detail ? `Re: ${REQUEST_TYPE_LABELS[detail.inquiry.request_type]} via website` : "", body: "" })
    setFollowUp(toDateTimeLocal(detail?.inquiry.follow_up_at ?? null))
    setNotes(detail?.inquiry.owner_notes ?? "")
    sendKey.current = ""
  }, [detail])

  useEffect(() => setTemplates(replyTemplates), [replyTemplates])

  const activities = useMemo(() => active?.activities ?? [], [active])
  if (detailError) return <aside className="rounded-xl border bg-card p-5"><StatusMessage tone="error">{detailError}</StatusMessage></aside>
  if (!active) return <aside className="hidden rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground xl:block"><MessageSquareText className="mx-auto mb-2 h-6 w-6" />Kies een aanvraag om de details en opvolging te bekijken.</aside>
  const inquiry = active.inquiry

  const update = (input: Parameters<typeof updateInquiryAction>[0], successText: string) => {
    startTransition(async () => {
      const result = await updateInquiryAction(input)
      if (!result.success) return setNotice({ tone: "error", text: result.error })
      setActive((current) => current ? { ...current, inquiry: { ...current.inquiry, ...result.inquiry } } : current)
      setNotice({ tone: "success", text: successText })
      router.refresh()
    })
  }

  const sendReply = () => {
    if (!sendKey.current) sendKey.current = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    startTransition(async () => {
      const result = await sendInquiryReplyAction({ businessId, inquiryId: inquiry.id, subject: reply.subject, body: reply.body, idempotencyKey: sendKey.current })
      if (!result.success) return setNotice({ tone: "error", text: result.error })
      setActive((current) => current ? { ...current, inquiry: { ...current.inquiry, status: "awaiting_customer", last_replied_at: result.message.sent_at, last_activity_at: result.message.sent_at ?? new Date().toISOString() }, messages: [...current.messages, result.message] } : current)
      setReply((current) => ({ ...current, body: "" }))
      sendKey.current = ""
      setNotice({ tone: "success", text: "Reactie verzonden." })
      router.refresh()
    })
  }

  const saveTemplate = () => {
    startTransition(async () => {
      const result = await saveInquiryReplyTemplateAction({ businessId, name: templateName, subject: reply.subject, body: reply.body })
      if (!result.success) return setNotice({ tone: "error", text: result.error })
      setTemplates((current) => [...current.filter((template) => template.id !== result.template.id && template.name !== result.template.name), result.template].sort((left, right) => left.name.localeCompare(right.name, "nl")))
      setTemplateName("")
      setNotice({ tone: "success", text: "Reactietemplate opgeslagen." })
      router.refresh()
    })
  }

  const bookingHref = active.calendarEntry
    ? active.calendarEntry.entry_type === "booking" ? `/editor/reservations?reservation=${encodeURIComponent(active.calendarEntry.id)}` : `/editor/calendar?booking=${encodeURIComponent(active.calendarEntry.id)}`
    : null

  return (
    <aside className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{REQUEST_TYPE_LABELS[inquiry.request_type]}</p><h2 className="text-lg font-semibold">{inquiry.name || "Naam onbekend"}</h2></div><StatusBadge status={inquiry.status} /></div>
      {notice ? <div className="mt-3"><StatusMessage tone={notice.tone}>{notice.text}</StatusMessage></div> : null}
      <dl className="mt-4 grid gap-2 text-sm"><div className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 text-muted-foreground" /><a className="break-all text-primary underline-offset-2 hover:underline" href={`mailto:${inquiry.email}`}>{inquiry.email || "Geen e-mail"}</a></div>{inquiry.phone ? <div className="flex gap-2"><UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" /><a className="text-primary underline-offset-2 hover:underline" href={`tel:${inquiry.phone}`}>{inquiry.phone}</a></div> : null}{inquiry.service ? <div><dt className="text-muted-foreground">Aanbod</dt><dd>{inquiry.service}</dd></div> : null}{inquiry.preferred_date ? <div><dt className="text-muted-foreground">Gewenst moment</dt><dd>{inquiry.preferred_date} <span className="text-xs text-muted-foreground">(nog niet gecontroleerd op beschikbaarheid)</span></dd></div> : null}</dl>
      {inquiry.message ? <section className="mt-4 rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap"><p className="mb-1 text-xs font-medium text-muted-foreground">Bericht</p>{inquiry.message}</section> : null}
      {bookingHref ? <Button asChild variant="outline" className="mt-3 w-full"><Link href={bookingHref}><CalendarDays className="h-4 w-4" />Open in {active.calendarEntry?.entry_type === "booking" ? "reserveringen" : "kalender"}</Link></Button> : null}

      <section className="mt-5 grid gap-3 border-t pt-4"><Label htmlFor="inquiry-status">Fase</Label><select id="inquiry-status" value={inquiry.status} disabled={isPending} onChange={(event) => update({ businessId, inquiryId: inquiry.id, status: event.target.value as InquiryStatus }, "Fase bijgewerkt.")} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{INQUIRY_STATUSES.map((status) => <option key={status} value={status}>{INQUIRY_STATUS_LABELS[status]}</option>)}</select><div><Label htmlFor="inquiry-followup">Opvolgmoment</Label><div className="mt-1 flex gap-2"><Input id="inquiry-followup" type="datetime-local" value={followUp} disabled={isPending} onChange={(event) => setFollowUp(event.target.value)} /><Button type="button" variant="outline" disabled={isPending} onClick={() => update({ businessId, inquiryId: inquiry.id, followUpAt: followUp ? new Date(followUp).toISOString() : null }, "Opvolgmoment opgeslagen.")}>Bewaar</Button></div></div><div><Label htmlFor="inquiry-notes">Interne notities</Label><Textarea id="inquiry-notes" className="mt-1" value={notes} maxLength={4000} disabled={isPending} onChange={(event) => setNotes(event.target.value)} onBlur={() => update({ businessId, inquiryId: inquiry.id, ownerNotes: notes }, "Notities opgeslagen.")} placeholder="Alleen zichtbaar voor u." /></div></section>

      <section className="mt-5 border-t pt-4"><div className="flex items-center gap-2"><Send className="h-4 w-4" /><h3 className="font-semibold">E-mail beantwoorden</h3></div><p className="mt-1 text-xs text-muted-foreground">Verzonden via FlexPagina. Een reply komt terecht op het ingestelde ontvangstadres van dit bedrijf.</p><div className="mt-3 grid gap-2">{templates.length ? <select aria-label="Kies reactietemplate" defaultValue="" disabled={isPending} onChange={(event) => { const template = templates.find((item) => item.id === event.target.value); if (template) setReply({ subject: applyReplyTemplate(template.subject, inquiry), body: applyReplyTemplate(template.body, inquiry) }); event.currentTarget.value = "" }} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Gebruik een opgeslagen template…</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select> : null}<p className="text-xs text-muted-foreground">Templates ondersteunen alleen <code>{"{{name}}"}</code>, <code>{"{{service}}"}</code> en <code>{"{{preferred_date}}"}</code>.</p><Input value={reply.subject} maxLength={200} disabled={isPending} onChange={(event) => setReply((current) => ({ ...current, subject: event.target.value }))} aria-label="Onderwerp antwoord" /><Textarea value={reply.body} maxLength={8000} disabled={isPending} onChange={(event) => setReply((current) => ({ ...current, body: event.target.value }))} placeholder="Schrijf uw reactie…" aria-label="Tekst antwoord" /><div className="flex gap-2"><Input value={templateName} maxLength={80} disabled={isPending} onChange={(event) => setTemplateName(event.target.value)} placeholder="Naam voor deze template" aria-label="Naam reactietemplate" /><Button type="button" variant="outline" disabled={isPending || !templateName.trim() || !reply.subject.trim() || !reply.body.trim()} onClick={saveTemplate}>Opslaan</Button></div><Button type="button" disabled={isPending || !reply.subject.trim() || !reply.body.trim()} onClick={sendReply}><Send className="h-4 w-4" />{isPending ? "Versturen…" : "Verstuur reactie"}</Button></div></section>

      <section className="mt-5 border-t pt-4"><h3 className="font-semibold">Geschiedenis</h3><ol className="mt-3 grid gap-2 text-sm">{active.messages.map((message) => <li key={message.id} className={`rounded-lg p-3 ${message.direction === "outbound" ? "bg-primary/5" : "bg-muted/60"}`}><div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>{message.direction === "outbound" ? "U heeft gemaild" : "Aanvraag ontvangen"}</span><time>{formatDate(message.sent_at ?? message.created_at)}</time></div><p className="mt-1 font-medium">{message.subject || "Website aanvraag"}</p><p className="mt-1 whitespace-pre-wrap text-sm">{message.body || "Geen bericht ingevuld."}</p>{message.delivery_status === "failed" ? <p className="mt-1 text-xs text-destructive">Niet verzonden: {message.error_message || "onbekende fout"}</p> : null}</li>)}{activities.map((activity) => <li key={activity.id} className="rounded-lg border border-dashed p-2 text-xs text-muted-foreground"><time>{formatDate(activity.created_at)}</time> · {activity.body}</li>)}</ol></section>
    </aside>
  )
}
