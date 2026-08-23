"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  Mail,
  Phone,
  ReceiptText,
  Search,
  UserRound,
  X,
} from "lucide-react"
import { transitionReservationStatusAction } from "@/app/editor/reservations/actions"
import { BookingFinancePanel } from "@/components/calendar/booking-finance-panel"
import { BookingStatusBadge } from "@/components/booking/booking-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/booking/status-presentation"
import type { BookingFinanceData, BookingInvoice, ReservationFinancial, SettlementStatus } from "@/lib/booking/invoicing"
import type { BookingLifecycleData } from "@/lib/booking/lifecycle"
import type {
  ReservationOverviewFilters,
  ReservationOverviewItem,
  ReservationOverviewResult,
} from "@/lib/booking/reservations"
import type { CalendarEntry, CalendarEntrySource, CalendarEntryStatus } from "@/lib/supabase/calendar"
import type { Service } from "@/lib/supabase/services"

export interface ReservationDetailData {
  entry: CalendarEntry
  lifecycle: BookingLifecycleData
  lifecycleUnavailable: boolean
  financial: ReservationFinancial | null
  invoices: BookingInvoice[]
  invoiceProfile: BookingFinanceData["profile"]
  financeUnavailable: boolean
}

interface ReservationsClientProps {
  businessId: string
  overview: ReservationOverviewResult
  filters: ReservationOverviewFilters
  services: Service[]
  offeringCopy: { singular: string; plural: string; title: string }
  detail: ReservationDetailData | null
  detailError: string | null
  schemaError: string | null
  canManage: boolean
}

const SOURCE_LABELS: Record<CalendarEntrySource, string> = {
  manual: "Handmatig",
  website_form: "Website",
  contact_request: "Aanvraag",
  import: "Import",
}

const SETTLEMENT_LABELS: Record<SettlementStatus, string> = {
  open: "Open",
  paid: "Betaald",
  refunded: "Terugbetaald",
}

const selectClassName = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"

function safeDateFormatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat("nl-NL", { ...options, timeZone })
  } catch {
    return new Intl.DateTimeFormat("nl-NL", { ...options, timeZone: "Europe/Amsterdam" })
  }
}

function formatReservationRange(entry: CalendarEntry) {
  const start = new Date(entry.start_at)
  const end = new Date(entry.end_at)
  const date = safeDateFormatter(entry.timezone, { dateStyle: "medium" })
  const time = safeDateFormatter(entry.timezone, { hour: "2-digit", minute: "2-digit" })
  const sameDay = date.format(start) === date.format(end)
  if (entry.all_day || entry.entry_type === "booking") {
    return sameDay ? date.format(start) : `${date.format(start)} – ${date.format(end)}`
  }
  return sameDay
    ? `${date.format(start)}, ${time.format(start)} – ${time.format(end)}`
    : `${date.format(start)}, ${time.format(start)} – ${date.format(end)}, ${time.format(end)}`
}

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

function formatMoney(amountMinor: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amountMinor / 100)
}

function financialAmount(financial: ReservationFinancial) {
  return financial.pricing_status === "ready"
    ? formatMoney(financial.total_minor, financial.currency)
    : "Prijs controleren"
}

function reservationNumber(item: ReservationOverviewItem) {
  return item.financial?.reservation_number || "Nog geen nummer"
}

function activeFilterCount(filters: ReservationOverviewFilters) {
  return [filters.query, filters.status !== "all", filters.serviceId, filters.source !== "all", filters.type !== "all", filters.settlement !== "all", filters.dateFrom, filters.dateTo, filters.sort !== "created_desc"].filter(Boolean).length
}

export function ReservationsClient({
  businessId,
  overview,
  filters,
  services,
  offeringCopy,
  detail,
  detailError,
  schemaError,
  canManage,
}: ReservationsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchText, setSearchText] = useState(filters.query)
  const filterCount = activeFilterCount(filters)

  useEffect(() => setSearchText(filters.query), [filters.query])
  useEffect(() => {
    if (searchText.trim() === filters.query) return
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString())
      if (searchText.trim()) next.set("query", searchText.trim())
      else next.delete("query")
      next.delete("page")
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [filters.query, pathname, router, searchParams, searchText])

  const setFilter = (name: string, value: string, defaultValue = "") => {
    const next = new URLSearchParams(searchParams.toString())
    if (!value || value === defaultValue) next.delete(name)
    else next.set(name, value)
    if (name !== "page") next.delete("page")
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const openDetail = (entryId: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("reservation", entryId)
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete("reservation")
    router.push(next.size ? `${pathname}?${next.toString()}` : pathname, { scroll: false })
  }

  const clearFilters = () => {
    const next = new URLSearchParams()
    const selected = searchParams.get("reservation")
    if (selected) next.set("reservation", selected)
    setSearchText("")
    router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, { scroll: false })
  }

  const visibleStatuses: CalendarEntryStatus[] = overview.statusCounts.blocked > 0
    ? ["pending", "confirmed", "completed", "cancelled", "blocked"]
    : ["pending", "confirmed", "completed", "cancelled"]
  const rangeStart = overview.total === 0 ? 0 : (overview.page - 1) * overview.pageSize + 1
  const rangeEnd = Math.min(overview.page * overview.pageSize, overview.total)

  return (
    <div className="grid gap-4 sm:gap-5">
      {schemaError ? <StatusMessage tone="error">{schemaError}</StatusMessage> : null}
      {!canManage ? (
        <StatusMessage tone="warning">
          U kunt reserveringen bekijken. Status-, prijs- en factuurwijzigingen vereisen het Gold-abonnement.
        </StatusMessage>
      ) : null}
      {overview.financeUnavailable ? (
        <StatusMessage tone="warning">
          Reserveringen zijn beschikbaar, maar reserveringsnummers, bedragen en betaalstatussen konden niet worden geladen.
        </StatusMessage>
      ) : null}

      <section aria-label="Reserveringen per status" className={`grid gap-2 ${visibleStatuses.length === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
        {visibleStatuses.map((status) => {
          const active = filters.status === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter("status", active ? "" : status)}
              className={`rounded-xl border bg-card p-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-4 ${active ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}
            >
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${BOOKING_STATUS_STYLES[status]}`}>{BOOKING_STATUS_LABELS[status]}</span>
              <span className="mt-2 block text-2xl font-semibold text-foreground">{overview.statusCounts[status]}</span>
            </button>
          )
        })}
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm" aria-labelledby="reservation-filters-title">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 id="reservation-filters-title" className="font-semibold">Zoeken en filteren</h2>
          </div>
          {filterCount > 0 ? <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Wis {filterCount} filters</Button> : null}
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <Label htmlFor="reservation-search">Zoeken</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="reservation-search" className="pl-9" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Naam, e-mail of reserveringsnummer" />
            </div>
          </div>
          <FilterSelect id="reservation-status" label="Status" value={filters.status} onChange={(value) => setFilter("status", value, "all")}>
            <option value="all">Alle statussen</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </FilterSelect>
          <FilterSelect id="reservation-service" label={offeringCopy.singular[0].toUpperCase() + offeringCopy.singular.slice(1)} value={filters.serviceId} onChange={(value) => setFilter("service", value)}>
            <option value="">Alle {offeringCopy.plural.toLowerCase()}</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
          </FilterSelect>
          <FilterSelect id="reservation-source" label="Bron" value={filters.source} onChange={(value) => setFilter("source", value, "all")}>
            <option value="all">Alle bronnen</option>
            <option value="manual">Handmatig</option>
            <option value="website_form">Website</option>
            <option value="contact_request">Aanvraag</option>
          </FilterSelect>
          <FilterSelect id="reservation-type" label="Type" value={filters.type} onChange={(value) => setFilter("type", value, "all")}>
            <option value="all">Alle typen</option>
            <option value="booking">Boeking</option>
            <option value="appointment">Afspraak</option>
          </FilterSelect>
          <FilterSelect id="reservation-settlement" label="Betaalstatus" value={filters.settlement} disabled={overview.financeUnavailable} onChange={(value) => setFilter("settlement", value, "all")}>
            <option value="all">Alle betaalstatussen</option>
            <option value="open">Open</option>
            <option value="paid">Betaald</option>
            <option value="refunded">Terugbetaald</option>
          </FilterSelect>
          <FilterSelect id="reservation-sort" label="Sortering" value={filters.sort} onChange={(value) => setFilter("sort", value, "created_desc")}>
            <option value="created_desc">Nieuwste eerst</option>
            <option value="start_asc">Datum oplopend</option>
            <option value="start_desc">Datum aflopend</option>
          </FilterSelect>
          <div>
            <Label htmlFor="reservation-from">Vanaf</Label>
            <Input id="reservation-from" className="mt-1" type="date" value={filters.dateFrom} onChange={(event) => setFilter("from", event.target.value)} />
          </div>
          <div>
            <Label htmlFor="reservation-to">Tot en met</Label>
            <Input id="reservation-to" className="mt-1" type="date" value={filters.dateTo} onChange={(event) => setFilter("to", event.target.value)} />
          </div>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-labelledby="reservations-list-title">
        <div className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="reservations-list-title" className="font-semibold">Alle reserveringen</h2>
            <p className="text-xs text-muted-foreground">{overview.total === 0 ? "Geen resultaten" : `${rangeStart}–${rangeEnd} van ${overview.total}`}</p>
          </div>
          <p className="text-xs text-muted-foreground">Klik op een reservering voor status, klantgegevens en facturen.</p>
        </div>

        {overview.items.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></div>
              <h3 className="mt-3 font-semibold">{filterCount ? "Geen reserveringen gevonden" : "Nog geen reserveringen"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{filterCount ? "Pas de zoekopdracht of filters aan." : "Nieuwe boekingen en afspraken verschijnen automatisch in dit overzicht."}</p>
              {filterCount ? <Button className="mt-4" variant="outline" onClick={clearFilters}>Filters wissen</Button> : null}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-muted/70 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reservering</th>
                    <th className="px-4 py-3 font-medium">Klant</th>
                    <th className="px-4 py-3 font-medium">{offeringCopy.singular[0].toUpperCase() + offeringCopy.singular.slice(1)}</th>
                    <th className="px-4 py-3 font-medium">Datum</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Bedrag</th>
                    <th className="px-4 py-3 font-medium">Bron</th>
                    <th className="px-4 py-3"><span className="sr-only">Acties</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overview.items.map((item) => <ReservationTableRow key={item.entry.id} item={item} onOpen={openDetail} />)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {overview.items.map((item) => <ReservationMobileCard key={item.entry.id} item={item} onOpen={openDetail} />)}
            </div>
          </>
        )}

        {overview.total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pagina {overview.page} van {overview.pageCount}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={overview.page <= 1} onClick={() => setFilter("page", String(overview.page - 1), "1")}><ChevronLeft /> Vorige</Button>
              <Button type="button" variant="outline" size="sm" disabled={overview.page >= overview.pageCount} onClick={() => setFilter("page", String(overview.page + 1), "1")}>Volgende <ChevronRight /></Button>
            </div>
          </div>
        ) : null}
      </section>

      {detail || detailError ? (
        <ReservationDetailDialog
          businessId={businessId}
          detail={detail}
          error={detailError}
          offering={detail?.entry.service_id ? services.find((service) => service.id === detail.entry.service_id) : undefined}
          canManage={canManage}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  )
}

function FilterSelect({ id, label, value, disabled, onChange, children }: { id: string; label: string; value: string; disabled?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return <div><Label htmlFor={id}>{label}</Label><select id={id} className={`${selectClassName} mt-1`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{children}</select></div>
}

function ReservationTableRow({ item, onOpen }: { item: ReservationOverviewItem; onOpen: (entryId: string) => void }) {
  const { entry, financial } = item
  return (
    <tr className="transition-colors hover:bg-muted/45">
      <td className="px-4 py-3"><p className="max-w-44 truncate font-medium">{reservationNumber(item)}</p><p className="max-w-44 truncate text-xs text-muted-foreground">{entry.title || (entry.entry_type === "booking" ? "Boeking" : "Afspraak")}</p></td>
      <td className="px-4 py-3"><p className="max-w-44 truncate font-medium">{entry.customer_name || "Naam onbekend"}</p><p className="max-w-44 truncate text-xs text-muted-foreground">{entry.customer_email || entry.customer_phone || "Geen contactgegevens"}</p></td>
      <td className="px-4 py-3"><span className="block max-w-40 truncate">{item.offering_title || "Niet gekoppeld"}</span></td>
      <td className="px-4 py-3"><span className="block max-w-56">{formatReservationRange(entry)}</span><span className="text-xs text-muted-foreground">Bijgewerkt {formatUpdated(entry.updated_at)}</span></td>
      <td className="px-4 py-3"><BookingStatusBadge status={entry.status} /></td>
      <td className="px-4 py-3">{financial ? <><p className="font-medium">{financialAmount(financial)}</p><p className="text-xs text-muted-foreground">{SETTLEMENT_LABELS[financial.settlement_status]}</p></> : <span className="text-xs text-muted-foreground">Niet beschikbaar</span>}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{SOURCE_LABELS[entry.source]}</td>
      <td className="px-4 py-3 text-right"><Button type="button" variant="outline" size="sm" onClick={() => onOpen(entry.id)}>Details</Button></td>
    </tr>
  )
}

function ReservationMobileCard({ item, onOpen }: { item: ReservationOverviewItem; onOpen: (entryId: string) => void }) {
  const { entry, financial } = item
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{reservationNumber(item)}</p><p className="truncate text-xs text-muted-foreground">{entry.customer_name || "Naam onbekend"}</p></div><BookingStatusBadge status={entry.status} /></div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">{item.offering_title ? "Aanbod" : "Type"}</dt><dd className="max-w-[65%] text-right font-medium">{item.offering_title || (entry.entry_type === "booking" ? "Boeking" : "Afspraak")}</dd></div>
        <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Datum</dt><dd className="max-w-[70%] text-right">{formatReservationRange(entry)}</dd></div>
        <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Bedrag</dt><dd className="text-right">{financial ? `${financialAmount(financial)} · ${SETTLEMENT_LABELS[financial.settlement_status]}` : "Niet beschikbaar"}</dd></div>
      </dl>
      <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={() => onOpen(entry.id)}>Reservering bekijken</Button>
    </article>
  )
}

function ReservationDetailDialog({ businessId, detail, error, offering, canManage, onClose }: { businessId: string; detail: ReservationDetailData | null; error: string | null; offering?: Service; canManage: boolean; onClose: () => void }) {
  const router = useRouter()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const pendingRef = useRef(false)
  const [entry, setEntry] = useState(detail?.entry ?? null)
  const [financial, setFinancial] = useState(detail?.financial ?? null)
  const [invoices, setInvoices] = useState(detail?.invoices ?? [])
  const [privateNote, setPrivateNote] = useState("")
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { pendingRef.current = isPending }, [isPending])

  useEffect(() => {
    setEntry(detail?.entry ?? null)
    setFinancial(detail?.financial ?? null)
    setInvoices(detail?.invoices ?? [])
    setPrivateNote("")
  }, [detail])
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !pendingRef.current) onCloseRef.current() }
    window.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [])

  const transitionStatus = (target: CalendarEntryStatus) => {
    if (!entry) return
    startTransition(async () => {
      const result = await transitionReservationStatusAction(businessId, entry.id, target, privateNote)
      if (!result.success) return setNotice({ tone: "error", text: result.error })
      setEntry(result.entry)
      setPrivateNote("")
      setNotice({ tone: "success", text: `Status gewijzigd naar ${BOOKING_STATUS_LABELS[result.entry.status]}.` })
      router.refresh()
    })
  }

  const pendingChanges = detail?.lifecycle.changeRequests.filter((request) => request.status === "pending") ?? []

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title">
      <button type="button" tabIndex={-1} className="absolute inset-0 cursor-default" onClick={() => { if (!isPending) onClose() }} aria-label="Reserveringsdetails sluiten" />
      <div className="relative h-full w-full overflow-y-auto bg-muted shadow-2xl sm:max-w-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Reserveringsdetails</p>
            <h2 id="reservation-detail-title" className="mt-1 truncate text-xl font-semibold">{entry?.customer_name || "Reservering"}</h2>
            {entry ? <p className="truncate text-xs text-muted-foreground">{financial?.reservation_number || entry.title || "Nog geen reserveringsnummer"}</p> : null}
          </div>
          <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" onClick={onClose} disabled={isPending} aria-label="Sluiten"><X /></Button>
        </header>

        <div className="grid gap-4 p-4 sm:p-6">
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          {notice ? <StatusMessage tone={notice.tone}>{notice.text}</StatusMessage> : null}
          {entry ? (
            <>
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs text-muted-foreground">Actuele status</p><div className="mt-1"><BookingStatusBadge status={entry.status} /></div></div>
                  <Button asChild variant="outline" size="sm"><Link href={`/editor/calendar?booking=${encodeURIComponent(entry.id)}`}>Bekijk in kalender <ExternalLink /></Link></Button>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <DetailField icon={<CalendarDays />} label="Datum" value={formatReservationRange(entry)} />
                  <DetailField icon={<Clock3 />} label="Tijdzone" value={entry.timezone} />
                  <DetailField icon={<ReceiptText />} label="Type en bron" value={`${entry.entry_type === "booking" ? "Boeking" : "Afspraak"} · ${SOURCE_LABELS[entry.source]}`} />
                  <DetailField icon={<CheckCircle2 />} label="Aanbod" value={offering?.title || "Niet gekoppeld"} />
                </dl>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" /><h3 className="font-semibold">Klantgegevens en notities</h3></div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <DetailField icon={<UserRound />} label="Naam" value={entry.customer_name || "Niet ingevuld"} />
                  <DetailField icon={<Mail />} label="E-mail" value={entry.customer_email || "Niet ingevuld"} />
                  <DetailField icon={<Phone />} label="Telefoon" value={entry.customer_phone || "Niet ingevuld"} />
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Interne notities</dt><dd className="mt-1 whitespace-pre-wrap rounded-md bg-muted/60 p-3">{entry.internal_notes || "Geen interne notities."}</dd></div>
                </dl>
              </section>

              {(entry.status === "pending" || entry.status === "confirmed") ? (
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
                  <h3 className="font-semibold">Status bijwerken</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Online boekingen gebruiken automatisch de bestaande historie en klantmeldingen.</p>
                  <div className="mt-3"><Label htmlFor="reservation-private-note">Interne actienotitie</Label><Input id="reservation-private-note" className="mt-1" value={privateNote} maxLength={2000} disabled={!canManage || isPending} onChange={(event) => setPrivateNote(event.target.value)} placeholder="Alleen zichtbaar voor de eigenaar" /></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.status === "pending" ? <Button type="button" disabled={!canManage || isPending || detail?.lifecycleUnavailable} onClick={() => transitionStatus("confirmed")}>Accepteren</Button> : null}
                    {entry.status === "confirmed" ? <Button type="button" disabled={!canManage || isPending} onClick={() => transitionStatus("completed")}>Als afgerond markeren</Button> : null}
                    <Button type="button" variant="outline" disabled={!canManage || isPending || (entry.status === "pending" && detail?.lifecycleUnavailable)} onClick={() => transitionStatus("cancelled")}>{entry.status === "pending" ? "Afwijzen" : "Annuleren"}</Button>
                  </div>
                </section>
              ) : null}

              {entry.metadata?.source === "booking_engine" ? (
                <section className="rounded-xl border border-border bg-card shadow-sm">
                  <details open={pendingChanges.length > 0}>
                    <summary className="cursor-pointer list-none px-4 py-3"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Boekingsverloop en verzoeken</h3><p className="text-xs text-muted-foreground">{detail?.lifecycle.history.length ?? 0} gebeurtenissen vastgelegd</p></div>{pendingChanges.length ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{pendingChanges.length} open</span> : null}</div></summary>
                    <div className="grid gap-3 border-t border-border p-4">
                      {detail?.lifecycleUnavailable ? <StatusMessage tone="warning">Statusgeschiedenis is niet beschikbaar. Pas de lifecycle-migratie toe.</StatusMessage> : null}
                      {pendingChanges.map((request) => <article key={request.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">{request.requested_by === "customer" ? "Klantverzoek" : "Alternatief voorstel"}</p><p className="mt-1">{formatReservationRange({ ...entry, start_at: request.proposed_start_at, end_at: request.proposed_end_at })}</p>{request.customer_message ? <p className="mt-1 text-xs">{request.customer_message}</p> : null}<Button asChild variant="outline" size="sm" className="mt-3 bg-white"><Link href={`/editor/calendar?booking=${encodeURIComponent(entry.id)}`}>Verzoek in kalender behandelen</Link></Button></article>)}
                      {detail?.lifecycle.history.length ? <ol className="grid gap-2">{detail.lifecycle.history.map((item) => <li key={item.id} className="rounded-md bg-muted/60 p-3 text-xs"><div className="flex justify-between gap-3"><span className="font-semibold capitalize">{item.event_type.replaceAll("_", " ")}</span><time className="shrink-0 text-muted-foreground">{formatUpdated(item.created_at)}</time></div>{item.public_message ? <p className="mt-1 text-muted-foreground">Klantbericht: {item.public_message}</p> : null}{item.private_note ? <p className="mt-1 text-muted-foreground">Intern: {item.private_note}</p> : null}</li>)}</ol> : <p className="text-sm text-muted-foreground">Nog geen statusgeschiedenis vastgelegd.</p>}
                    </div>
                  </details>
                </section>
              ) : null}

              {entry.metadata?.source === "booking_engine" && detail && canManage ? (
                <BookingFinancePanel
                  idPrefix="reservation-detail-finance"
                  entry={entry}
                  offering={offering}
                  financial={financial}
                  invoices={invoices}
                  profile={detail.invoiceProfile}
                  unavailable={detail.financeUnavailable}
                  onFinancialChange={setFinancial}
                  onInvoicesChange={setInvoices}
                />
              ) : entry.metadata?.source === "booking_engine" && detail ? (
                <ReadOnlyFinanceSummary detail={detail} financial={financial} invoices={invoices} />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-2"><span className="mt-0.5 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span><div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div></div>
}

function ReadOnlyFinanceSummary({ detail, financial, invoices }: { detail: ReservationDetailData; financial: ReservationFinancial | null; invoices: BookingInvoice[] }) {
  if (detail.financeUnavailable) return <StatusMessage tone="warning">Prijs- en factuurgegevens zijn niet beschikbaar.</StatusMessage>
  if (!financial) return <StatusMessage tone="info">Het reserveringsnummer wordt aangemaakt zodra de online boeking is bevestigd.</StatusMessage>
  const visibleInvoices = invoices.filter((invoice) => invoice.status !== "draft")
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-primary" /><h3 className="font-semibold">Prijs en facturen</h3></div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Reserveringsnummer</dt><dd className="mt-1 font-medium">{financial.reservation_number}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Totaal</dt><dd className="mt-1 font-medium">{financialAmount(financial)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Handmatige betaalstatus</dt><dd className="mt-1 font-medium">{SETTLEMENT_LABELS[financial.settlement_status]}</dd></div>
      </dl>
      {visibleInvoices.length ? <div className="mt-4 border-t border-border pt-3"><p className="text-xs font-medium text-muted-foreground">Facturen</p><div className="mt-2 flex flex-wrap gap-2">{visibleInvoices.map((invoice) => <Button key={invoice.id} asChild variant="outline" size="sm"><a href={`/api/booking/invoices/${invoice.id}/pdf`}>{invoice.invoice_number || "Factuur"} <ExternalLink /></a></Button>)}</div></div> : null}
    </section>
  )
}
