"use client"

import { Fragment, useEffect, useMemo, useState, useTransition } from "react"
import { AlertTriangle, Ban, CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, Plus, Save, Trash2, X } from "lucide-react"
import {
  acceptRescheduleRequestAction,
  createAvailabilityWindowAction,
  createCalendarEntryAction,
  deleteAvailabilityWindowAction,
  deleteCalendarEntryAction,
  proposeAlternativeAction,
  rejectRescheduleRequestAction,
  transitionBookingAction,
  updateCalendarEntryAction,
} from "@/app/editor/calendar/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import type {
  CalendarAvailabilityWindow,
  CalendarEntry,
  CalendarEntrySource,
  CalendarEntryStatus,
  CalendarEntryType,
} from "@/lib/supabase/calendar"
import type { Service } from "@/lib/supabase/services"
import type { BusinessCategory } from "@/lib/business/categories"
import type { BookingChangeRequest, BookingHistoryItem, BookingLifecycleData } from "@/lib/booking/lifecycle"
import type { CalendarSyncData } from "@/lib/calendar/sync"
import { BookingFinancePanel } from "@/components/calendar/booking-finance-panel"
import type {
  BookingFinanceData,
  BookingInvoice,
  ReservationFinancial,
} from "@/lib/booking/invoicing"

type CalendarView = "month" | "week" | "day"

interface CalendarClientProps {
  businessId: string
  businessCategory: BusinessCategory | string
  initialEntries: CalendarEntry[]
  initialAvailabilityWindows: CalendarAvailabilityWindow[]
  initialLifecycle: BookingLifecycleData
  lifecycleUnavailable: boolean
  initialCalendarSync: CalendarSyncData
  calendarSyncUnavailable: boolean
  initialBookingFinance: BookingFinanceData
  bookingFinanceUnavailable: boolean
  offerings: Service[]
  initialOfferingId?: string | null
  initialEntryId?: string | null
  schemaError?: string | null
  copy: {
    title: string
    description: string
    primaryAction: string
    emptyTitle: string
    emptyText: string
    linkedOfferingLabel: string
    upcomingTitle: string
  }
  offeringCopy: {
    singular: string
    plural: string
    title: string
  }
}

type EntryFormState = {
  id?: string
  title: string
  entry_type: CalendarEntryType
  status: CalendarEntryStatus
  service_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  start_at: string
  end_at: string
  all_day: boolean
  internal_notes: string
  contact_request_id: string | null
  source: CalendarEntrySource
  metadata: Record<string, unknown>
}

type AvailabilityFormState = {
  service_id: string
  weekday: string
  start_time: string
  end_time: string
}

type CalendarFilterState = {
  query: string
  status: "all" | CalendarEntryStatus
  serviceId: "all" | "unlinked" | string
  source: "all" | CalendarEntrySource
  dateFrom: string
  dateTo: string
}

const WEEKDAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]
const WEEKDAY_FULL_LABELS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"]
const DAY_HOURS = Array.from({ length: 12 }, (_, index) => index + 8)

const STATUS_LABELS: Record<CalendarEntryStatus, string> = {
  pending: "In afwachting",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
  completed: "Afgerond",
  blocked: "Geblokkeerd",
}

const SOURCE_LABELS: Record<CalendarEntrySource, string> = {
  manual: "Handmatig",
  website_form: "Websiteformulier",
  contact_request: "Aanvraag",
  import: "Import",
}

const STATUS_STYLES: Record<CalendarEntryStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cancelled: "border-red-200 bg-red-50 text-red-900",
  completed: "border-slate-200 bg-slate-50 text-slate-700",
  blocked: "border-zinc-300 bg-zinc-100 text-zinc-800",
}

const STATUS_DOT_STYLES: Record<CalendarEntryStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  cancelled: "bg-red-500",
  completed: "bg-slate-500",
  blocked: "bg-zinc-600",
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next
}

function startOfMonthGrid(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toDateTimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(date)
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "2-digit", month: "long" }).format(date)
}

function formatItemCount(count: number, suffix: string) {
  return `${count} ${count === 1 ? "item" : "items"} ${suffix}`
}

function getCalendarViewRange(view: CalendarView, cursorDate: Date) {
  if (view === "month") {
    return {
      start: new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1),
      end: new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1),
      countSuffix: "deze maand",
      emptyRangeLabel: "deze maand",
    }
  }

  if (view === "week") {
    const start = startOfWeek(cursorDate)
    return {
      start,
      end: addDays(start, 7),
      countSuffix: "deze week",
      emptyRangeLabel: "deze week",
    }
  }

  const start = startOfDay(cursorDate)
  return {
    start,
    end: addDays(start, 1),
    countSuffix: "deze dag",
    emptyRangeLabel: "deze dag",
  }
}

function formatEntryTime(entry: CalendarEntry) {
  if (entry.all_day) return "Hele dag"
  const formatter = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" })
  return `${formatter.format(new Date(entry.start_at))} - ${formatter.format(new Date(entry.end_at))}`
}

function formatEntryRange(entry: CalendarEntry) {
  const formatter = new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: entry.all_day ? undefined : "2-digit",
    minute: entry.all_day ? undefined : "2-digit",
  })
  return `${formatter.format(new Date(entry.start_at))} - ${formatter.format(new Date(entry.end_at))}`
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b)
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB
}

function overlapsRange(entry: CalendarEntry, start: Date, end: Date) {
  return rangesOverlap(new Date(entry.start_at), new Date(entry.end_at), start, end)
}

function getEntryDayPhase(entry: CalendarEntry, day: Date) {
  const start = new Date(entry.start_at)
  const end = new Date(entry.end_at)
  const effectiveEnd = new Date(Math.max(start.getTime(), end.getTime() - 1))
  if (isSameDay(start, effectiveEnd)) return null
  if (isSameDay(start, day)) return "Aankomst"
  if (isSameDay(effectiveEnd, day)) return "Vertrek"
  return "Bezet"
}

function servicesOverlap(a: string | null | undefined, b: string | null | undefined) {
  return !a || !b || a === b
}

function matchesCalendarFilters(entry: CalendarEntry, filters: CalendarFilterState, searchText: string) {
  const query = filters.query.trim().toLocaleLowerCase("nl-NL")
  if (query && !searchText.includes(query)) return false
  if (filters.status !== "all" && entry.status !== filters.status) return false
  if (filters.source !== "all" && entry.source !== filters.source) return false
  if (filters.serviceId === "unlinked" && entry.service_id) return false
  if (filters.serviceId !== "all" && filters.serviceId !== "unlinked" && entry.service_id !== filters.serviceId) return false

  if (filters.dateFrom) {
    const from = new Date(`${filters.dateFrom}T00:00:00`)
    if (new Date(entry.end_at) < from) return false
  }

  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T23:59:59`)
    if (new Date(entry.start_at) > to) return false
  }

  return true
}

function getEntryConflicts(form: EntryFormState, entries: CalendarEntry[]) {
  const start = new Date(form.start_at)
  const end = new Date(form.end_at)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return []

  return entries.filter((entry) => {
    if (entry.id === form.id || entry.status === "cancelled" || entry.status === "completed") return false
    if (!servicesOverlap(form.service_id || null, entry.service_id)) return false
    return rangesOverlap(start, end, new Date(entry.start_at), new Date(entry.end_at))
  })
}

function getAvailabilityWarning(form: EntryFormState, windows: CalendarAvailabilityWindow[]) {
  if (form.entry_type === "blocked" || form.status === "blocked") return null

  const start = new Date(form.start_at)
  const end = new Date(form.end_at)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || !isSameDay(start, end)) return null

  const weekday = start.getDay() === 0 ? 7 : start.getDay()
  const matchingWindows = windows.filter(
    (window) =>
      window.is_active &&
      window.weekday === weekday &&
      (!window.service_id || !form.service_id || window.service_id === form.service_id),
  )

  if (matchingWindows.length === 0) return null

  const startTime = toDateTimeLocal(start).slice(11)
  const endTime = toDateTimeLocal(end).slice(11)
  const isInsideWindow = matchingWindows.some(
    (window) => startTime >= window.start_time.slice(0, 5) && endTime <= window.end_time.slice(0, 5),
  )

  return isInsideWindow ? null : "Deze tijd valt buiten de ingestelde beschikbaarheid."
}

function getDefaultFormState(category: BusinessCategory | string, startDate: Date): EntryFormState {
  const start = new Date(startDate)
  const end = new Date(startDate)
  end.setHours(end.getHours() + 1)

  return {
    title: category === "bnb" ? "Nieuwe boeking" : "Nieuwe afspraak",
    entry_type: category === "bnb" ? "booking" : "appointment",
    status: "pending",
    service_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    start_at: toDateTimeLocal(start),
    end_at: toDateTimeLocal(end),
    all_day: false,
    internal_notes: "",
    contact_request_id: null,
    source: "manual",
    metadata: {},
  }
}

function getBlockedFormState(startDate: Date): EntryFormState {
  const start = startOfDay(startDate)
  const end = addDays(start, 1)

  return {
    title: "Geblokkeerde periode",
    entry_type: "blocked",
    status: "blocked",
    service_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    start_at: toDateTimeLocal(start),
    end_at: toDateTimeLocal(end),
    all_day: true,
    internal_notes: "",
    contact_request_id: null,
    source: "manual",
    metadata: {},
  }
}

function formStateFromEntry(entry: CalendarEntry): EntryFormState {
  return {
    id: entry.id,
    title: entry.title,
    entry_type: entry.entry_type,
    status: entry.status,
    service_id: entry.service_id ?? "",
    customer_name: entry.customer_name,
    customer_email: entry.customer_email,
    customer_phone: entry.customer_phone,
    start_at: toDateTimeLocal(entry.start_at),
    end_at: toDateTimeLocal(entry.end_at),
    all_day: entry.all_day,
    internal_notes: entry.internal_notes,
    contact_request_id: entry.contact_request_id,
    source: entry.source,
    metadata: entry.metadata,
  }
}

function normalizeFormPayload(form: EntryFormState) {
  return {
    title: form.title,
    entry_type: form.entry_type,
    status: form.status,
    service_id: form.service_id || null,
    contact_request_id: form.contact_request_id,
    source: form.source,
    customer_name: form.customer_name,
    customer_email: form.customer_email,
    customer_phone: form.customer_phone,
    start_at: new Date(form.start_at).toISOString(),
    end_at: new Date(form.end_at).toISOString(),
    all_day: form.all_day,
    timezone: "Europe/Amsterdam",
    internal_notes: form.internal_notes,
    metadata: form.metadata,
  }
}

export function CalendarClient({
  businessId,
  businessCategory,
  initialEntries,
  initialAvailabilityWindows,
  initialLifecycle,
  lifecycleUnavailable,
  initialBookingFinance,
  bookingFinanceUnavailable,
  offerings,
  initialOfferingId,
  initialEntryId,
  schemaError,
  copy,
  offeringCopy,
}: CalendarClientProps) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [availabilityWindows, setAvailabilityWindows] = useState(initialAvailabilityWindows)
  const [lifecycleHistory, setLifecycleHistory] = useState(initialLifecycle.history)
  const [changeRequests, setChangeRequests] = useState(initialLifecycle.changeRequests)
  const [reservationFinancials, setReservationFinancials] = useState(initialBookingFinance.financials)
  const [bookingInvoices, setBookingInvoices] = useState(initialBookingFinance.invoices)
  const [activeView, setActiveView] = useState<CalendarView>("month")
  const [cursorDate, setCursorDate] = useState(() => new Date())
  const [filters, setFilters] = useState<CalendarFilterState>({
    query: "",
    status: "all",
    serviceId: initialOfferingId ?? "all",
    source: "all",
    dateFrom: "",
    dateTo: "",
  })
  const [form, setForm] = useState<EntryFormState | null>(() => {
    const initialEntry = initialEntries.find((entry) => entry.id === initialEntryId)
    return initialEntry ? formStateFromEntry(initialEntry) : null
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>({
    service_id: initialOfferingId ?? "",
    weekday: "1",
    start_time: "09:00",
    end_time: "17:00",
  })
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const { setIsSaving: setHeaderSaving, setSaveState, setActionLoading, setInfoText } = useEditorLayout()

  const selectedOffering = useMemo(
    () => (filters.serviceId !== "all" && filters.serviceId !== "unlinked"
      ? offerings.find((offering) => offering.id === filters.serviceId) ?? null
      : null),
    [offerings, filters.serviceId],
  )
  const searchTextByEntryId = useMemo(() => {
    const financialByEntryId = new Map(reservationFinancials.map((item) => [item.calendar_entry_id, item]))
    const invoiceNumbersByEntryId = new Map<string, string[]>()
    for (const invoice of bookingInvoices) {
      if (!invoice.invoice_number) continue
      invoiceNumbersByEntryId.set(invoice.calendar_entry_id, [
        ...(invoiceNumbersByEntryId.get(invoice.calendar_entry_id) ?? []),
        invoice.invoice_number,
      ])
    }
    return new Map(entries.map((entry) => [
      entry.id,
      [
        entry.title,
        entry.customer_name,
        entry.customer_email,
        entry.customer_phone,
        financialByEntryId.get(entry.id)?.reservation_number,
        ...(invoiceNumbersByEntryId.get(entry.id) ?? []),
      ].filter(Boolean).join(" ").toLocaleLowerCase("nl-NL"),
    ]))
  }, [bookingInvoices, entries, reservationFinancials])
  const visibleEntries = useMemo(
    () => entries.filter((entry) => matchesCalendarFilters(entry, filters, searchTextByEntryId.get(entry.id) ?? "")),
    [entries, filters, searchTextByEntryId],
  )
  const calendarViewRange = useMemo(() => getCalendarViewRange(activeView, cursorDate), [activeView, cursorDate])
  const visibleRangeEntries = useMemo(
    () =>
      visibleEntries.filter((entry) =>
        overlapsRange(entry, calendarViewRange.start, calendarViewRange.end),
      ),
    [calendarViewRange, visibleEntries],
  )
  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    filters.status !== "all" ||
    filters.serviceId !== "all" ||
    filters.source !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo)

  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>()
    const firstDay = activeView === "month" ? startOfMonthGrid(cursorDate) : calendarViewRange.start
    const numberOfDays = activeView === "month" ? 42 : activeView === "week" ? 7 : 1
    for (let offset = 0; offset < numberOfDays; offset += 1) {
      const day = addDays(firstDay, offset)
      const nextDay = addDays(day, 1)
      const dayEntries = visibleEntries.filter((entry) => overlapsRange(entry, day, nextDay))
      if (dayEntries.length > 0) grouped.set(dateKey(day), dayEntries)
    }
    return grouped
  }, [activeView, calendarViewRange.start, cursorDate, visibleEntries])

  const offeringTitleById = useMemo(
    () => new Map(offerings.map((offering) => [offering.id, offering.title])),
    [offerings],
  )

  const upcomingRange = useMemo(() => {
    const start = new Date()
    return {
      start,
      end: addDays(startOfDay(start), 30),
    }
  }, [])
  const upcomingEntries = useMemo(
    () =>
      [...visibleEntries]
        .filter((entry) =>
          entry.status !== "cancelled" &&
          rangesOverlap(new Date(entry.start_at), new Date(entry.end_at), upcomingRange.start, upcomingRange.end),
        )
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        .slice(0, 6),
    [upcomingRange, visibleEntries],
  )

  const pendingCount = visibleEntries.filter((entry) => entry.status === "pending").length
  const confirmedCount = visibleEntries.filter((entry) => entry.status === "confirmed").length
  const blockedCount = visibleEntries.filter((entry) => entry.status === "blocked").length
  const filteredCountLabel = formatItemCount(visibleEntries.length, "binnen filters")
  const rangeCountLabel = formatItemCount(visibleRangeEntries.length, calendarViewRange.countSuffix)
  const rangeEmptyFilterText = selectedOffering
    ? ` voor ${selectedOffering.title || offeringCopy.singular}`
    : hasActiveFilters
      ? " binnen de huidige filters"
      : ""
  const rangeEmptyText = `Er zijn ${filteredCountLabel}${rangeEmptyFilterText}, maar geen daarvan valt in ${calendarViewRange.emptyRangeLabel}. Kies een andere periode${hasActiveFilters ? " of pas de filters aan" : ""}.`
  const upcomingRuleText = `Komende 30 dagen binnen huidige filters, zonder geannuleerde items.`
  const upcomingEmptyText = visibleEntries.length === 0
    ? "Er zijn geen kalenderitems binnen de huidige filters. Pas de filters aan om meer items te zien."
    : `Er zijn ${filteredCountLabel}, maar geen actieve items in de komende 30 dagen. Kies een andere periode in de kalender${hasActiveFilters ? " of pas de filters aan" : ""}.`
  const formConflicts = form ? getEntryConflicts(form, entries) : []
  const availabilityWarning = form ? getAvailabilityWarning(form, availabilityWindows) : null
  const formLifecycleHistory = form?.id ? lifecycleHistory.filter((item) => item.calendar_entry_id === form.id) : []
  const formChangeRequests = form?.id ? changeRequests.filter((request) => request.calendar_entry_id === form.id) : []
  const formFinancial = form?.id ? reservationFinancials.find((item) => item.calendar_entry_id === form.id) ?? null : null
  const formInvoices = form?.id ? bookingInvoices.filter((invoice) => invoice.calendar_entry_id === form.id) : []
  const formOffering = form?.service_id ? offerings.find((offering) => offering.id === form.service_id) : undefined
  const formEntry = form?.id ? entries.find((entry) => entry.id === form.id) ?? null : null

  useEffect(() => {
    setLifecycleHistory(initialLifecycle.history)
    setChangeRequests(initialLifecycle.changeRequests)
  }, [initialLifecycle])

  useEffect(() => {
    setEntries(initialEntries)
    setAvailabilityWindows(initialAvailabilityWindows)
  }, [initialAvailabilityWindows, initialEntries])

  useEffect(() => {
    setReservationFinancials(initialBookingFinance.financials)
    setBookingInvoices(initialBookingFinance.invoices)
  }, [initialBookingFinance])

  useEffect(() => {
    setHeaderSaving(isPending)
    setActionLoading(isPending)
    if (isPending) setSaveState("saving")
  }, [isPending, setActionLoading, setHeaderSaving, setSaveState])

  useEffect(() => {
    setInfoText(`${filteredCountLabel}; ${rangeCountLabel}`)

    return () => {
      setInfoText(undefined)
    }
  }, [filteredCountLabel, rangeCountLabel, setInfoText])

  useEffect(() => {
    return () => {
      setHeaderSaving(false)
      setActionLoading(false)
      setInfoText(undefined)
    }
  }, [setActionLoading, setHeaderSaving, setInfoText])

  const clearFilters = () => {
    setFilters({
      query: "",
      status: "all",
      serviceId: "all",
      source: "all",
      dateFrom: "",
      dateTo: "",
    })
  }

  const openCreateForm = (date: Date, hour = 9) => {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const nextForm = getDefaultFormState(businessCategory, start)
    if (selectedOffering) nextForm.service_id = selectedOffering.id
    setForm(nextForm)
    setStatusMessage(null)
  }

  const openBlockedForm = (date: Date = cursorDate) => {
    const nextForm = getBlockedFormState(date)
    if (selectedOffering) nextForm.service_id = selectedOffering.id
    setForm(nextForm)
    setStatusMessage(null)
  }

  const openEditForm = (entry: CalendarEntry) => {
    if (entry.source === "import") {
      setForm(null)
      setStatusMessage({ tone: "success", text: "Dit is een alleen-lezen iCal-blokkade. Beheer deze via Externe kalenders." })
      return
    }
    setForm(formStateFromEntry(entry))
    setStatusMessage(null)
  }

  const moveCursor = (direction: -1 | 1) => {
    setCursorDate((current) => {
      const next = new Date(current)
      if (activeView === "month") next.setMonth(next.getMonth() + direction)
      if (activeView === "week") next.setDate(next.getDate() + direction * 7)
      if (activeView === "day") next.setDate(next.getDate() + direction)
      return next
    })
  }

  const submitForm = () => {
    if (!form || schemaError) return

    const start = new Date(form.start_at)
    const end = new Date(form.end_at)
    if (!form.title.trim()) {
      setSaveState("error")
      setStatusMessage({ tone: "error", text: "Titel is verplicht." })
      return
    }
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setSaveState("error")
      setStatusMessage({ tone: "error", text: "Eindtijd moet na starttijd liggen." })
      return
    }

    startTransition(async () => {
      try {
        const payload = normalizeFormPayload(form)
        const result = form.id
          ? await updateCalendarEntryAction(form.id, payload)
          : await createCalendarEntryAction(businessId, payload)

        if (!result.success) {
          setSaveState("error")
          setStatusMessage({ tone: "error", text: result.error })
          return
        }

        setEntries((current) => {
          const exists = current.some((entry) => entry.id === result.entry.id)
          if (exists) {
            return current.map((entry) => (entry.id === result.entry.id ? result.entry : entry))
          }
          return [...current, result.entry]
        })
        setForm(null)
        setSaveState("saved")
        setStatusMessage({ tone: "success", text: "Kalenderitem opgeslagen." })
      } catch (error) {
        console.error(error)
        setSaveState("error")
        setStatusMessage({ tone: "error", text: "Kalenderitem kon niet worden opgeslagen." })
      }
    })
  }

  const changeEntryStatus = (entryId: string, status: CalendarEntryStatus, privateNote = "") => {
    startTransition(async () => {
      try {
        const currentEntry = entries.find((entry) => entry.id === entryId)
        const isOnlineBooking = currentEntry?.metadata?.source === "booking_engine"
        const result = isOnlineBooking && (status === "confirmed" || status === "cancelled")
          ? await transitionBookingAction(entryId, status, privateNote)
          : await updateCalendarEntryAction(entryId, { status })

        if (!result.success) {
          setSaveState("error")
          setStatusMessage({ tone: "error", text: result.error })
          return
        }

        setEntries((current) => current.map((entry) => (entry.id === result.entry.id ? result.entry : entry)))
        setForm((current) => (current?.id === result.entry.id ? formStateFromEntry(result.entry) : current))
        setSaveState("saved")
        setStatusMessage({ tone: "success", text: status === "confirmed" ? "Aanvraag geaccepteerd." : "Aanvraag afgewezen." })
        if (status === "confirmed") router.refresh()
      } catch (error) {
        console.error(error)
        setSaveState("error")
        setStatusMessage({ tone: "error", text: "Status kon niet worden bijgewerkt." })
      }
    })
  }

  const proposeAlternative = (entryId: string, input: { startAt: string; endAt: string; customerMessage: string; privateNote: string }) => {
    startTransition(async () => {
      const result = await proposeAlternativeAction(entryId, input)
      if (!result.success) {
        setSaveState("error")
        setStatusMessage({ tone: "error", text: result.error })
        return
      }
      setChangeRequests((current) => [result.request, ...current.filter((request) => request.id !== result.request.id)])
      setSaveState("saved")
      setStatusMessage({ tone: "success", text: "Alternatief tijdstip is voorgesteld." })
    })
  }

  const resolveRescheduleRequest = (requestId: string, accept: boolean, privateNote = "") => {
    startTransition(async () => {
      const result = accept
        ? await acceptRescheduleRequestAction(requestId)
        : await rejectRescheduleRequestAction(requestId, privateNote)
      if (!result.success) {
        setSaveState("error")
        setStatusMessage({ tone: "error", text: result.error })
        return
      }
      setChangeRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: accept ? "accepted" : "rejected" } : request))
      if (accept && "entry" in result) {
        setEntries((current) => current.map((entry) => entry.id === result.entry.id ? result.entry : entry))
        setForm((current) => current?.id === result.entry.id ? formStateFromEntry(result.entry) : current)
      }
      setSaveState("saved")
      setStatusMessage({ tone: "success", text: accept ? "Verplaatsingsverzoek toegepast." : "Verplaatsingsverzoek afgewezen." })
    })
  }

  const deleteEntry = (entryId: string) => {
    startTransition(async () => {
      try {
        const result = await deleteCalendarEntryAction(entryId)

        if (!result.success) {
          setSaveState("error")
          setStatusMessage({ tone: "error", text: result.error })
          return
        }

        setEntries((current) => current.filter((entry) => entry.id !== result.id))
        setForm(null)
        setSaveState("saved")
        setStatusMessage({ tone: "success", text: "Kalenderitem verwijderd." })
      } catch (error) {
        console.error(error)
        setSaveState("error")
        setStatusMessage({ tone: "error", text: "Kalenderitem kon niet worden verwijderd." })
      }
    })
  }

  const createAvailabilityWindow = () => {
    if (schemaError) return
    if (!availabilityForm.start_time || !availabilityForm.end_time || availabilityForm.end_time <= availabilityForm.start_time) {
      setSaveState("error")
      setStatusMessage({ tone: "error", text: "Eindtijd van beschikbaarheid moet na starttijd liggen." })
      return
    }

    startTransition(async () => {
      try {
        const result = await createAvailabilityWindowAction(businessId, {
          service_id: availabilityForm.service_id || null,
          weekday: Number(availabilityForm.weekday),
          start_time: availabilityForm.start_time,
          end_time: availabilityForm.end_time,
          timezone: "Europe/Amsterdam",
          is_active: true,
        })

        if (!result.success) {
          setSaveState("error")
          setStatusMessage({ tone: "error", text: result.error })
          return
        }

        setAvailabilityWindows((current) => [...current, result.window].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)))
        setSaveState("saved")
        setStatusMessage({ tone: "success", text: "Beschikbaarheid opgeslagen." })
      } catch (error) {
        console.error(error)
        setSaveState("error")
        setStatusMessage({ tone: "error", text: "Beschikbaarheid kon niet worden opgeslagen." })
      }
    })
  }

  const deleteAvailabilityWindow = (windowId: string) => {
    startTransition(async () => {
      try {
        const result = await deleteAvailabilityWindowAction(windowId)

        if (!result.success) {
          setSaveState("error")
          setStatusMessage({ tone: "error", text: result.error })
          return
        }

        setAvailabilityWindows((current) => current.filter((window) => window.id !== result.id))
        setSaveState("saved")
        setStatusMessage({ tone: "success", text: "Beschikbaarheid verwijderd." })
      } catch (error) {
        console.error(error)
        setSaveState("error")
        setStatusMessage({ tone: "error", text: "Beschikbaarheid kon niet worden verwijderd." })
      }
    })
  }

  return (
    <div className="grid gap-4">
      {schemaError ? <StatusMessage tone="error">{schemaError}</StatusMessage> : null}
      {statusMessage ? <StatusMessage tone={statusMessage.tone}>{statusMessage.text}</StatusMessage> : null}
      {selectedOffering ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Toont planning voor {selectedOffering.title || offeringCopy.singular}
              </p>
              <p className="text-xs text-muted-foreground">
                Nieuwe kalenderitems worden standaard aan deze {offeringCopy.singular} gekoppeld.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 bg-background">
            <Link href="/editor/calendar">Alle {offeringCopy.plural.toLowerCase()} tonen</Link>
          </Button>
        </div>
      ) : null}

      <FilterPanel
        filters={filters}
        offerings={offerings}
        offeringCopy={offeringCopy}
        resultLabel={filteredCountLabel}
        hasActiveFilters={hasActiveFilters}
        isMobileOpen={mobileFiltersOpen}
        onMobileOpenChange={setMobileFiltersOpen}
        onChange={setFilters}
        onClear={clearFilters}
      />

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <SummaryCard label="In afwachting" shortLabel="Wachtend" value={pendingCount} tone="pending" active={filters.status === "pending"} onClick={() => setFilters((current) => ({ ...current, status: current.status === "pending" ? "all" : "pending" }))} />
        <SummaryCard label="Bevestigd" shortLabel="Bevestigd" value={confirmedCount} tone="confirmed" active={filters.status === "confirmed"} onClick={() => setFilters((current) => ({ ...current, status: current.status === "confirmed" ? "all" : "confirmed" }))} />
        <SummaryCard label="Geblokkeerd" shortLabel="Geblokkeerd" value={blockedCount} tone="blocked" active={filters.status === "blocked"} onClick={() => setFilters((current) => ({ ...current, status: current.status === "blocked" ? "all" : "blocked" }))} />
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">Kalenderoverzicht</h2>
              <p className="text-xs text-muted-foreground">
                {filteredCountLabel}; {rangeCountLabel}.
              </p>
            </div>
            <div className="grid w-full min-w-0 gap-2 lg:w-auto">
              <div className="flex min-w-0 items-center justify-between gap-2 lg:justify-end">
                <div className="inline-flex shrink-0 rounded-md border border-border bg-background p-0.5">
                  {(["month", "week", "day"] as CalendarView[]).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      aria-pressed={activeView === view}
                      className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        activeView === view
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {view === "month" ? "Maand" : view === "week" ? "Week" : "Dag"}
                    </button>
                  ))}
                </div>
                <div className="inline-flex shrink-0 items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => moveCursor(-1)} aria-label="Vorige periode" title="Vorige periode">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCursorDate(new Date())}>Vandaag</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => moveCursor(1)} aria-label="Volgende periode" title="Volgende periode">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                <Button type="button" size="sm" onClick={() => openCreateForm(cursorDate)} disabled={Boolean(schemaError)}>
                  <Plus className="h-4 w-4" />
                  {copy.primaryAction}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openBlockedForm()} disabled={Boolean(schemaError)}>
                  <Ban className="h-4 w-4" />
                  Blokkade
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {entries.length === 0 ? (
              <CalendarEmptyState
                title={copy.emptyTitle}
                text={copy.emptyText}
                actionLabel={copy.primaryAction}
                onCreate={() => openCreateForm(cursorDate)}
                disabled={Boolean(schemaError)}
              />
            ) : visibleEntries.length === 0 ? (
              <CalendarEmptyState
                title="Geen kalenderitems gevonden"
                text="Pas de filters aan of maak een nieuw kalenderitem voor deze selectie."
                actionLabel={copy.primaryAction}
                onCreate={() => openCreateForm(cursorDate)}
                onClear={hasActiveFilters ? clearFilters : undefined}
                disabled={Boolean(schemaError)}
              />
            ) : visibleRangeEntries.length === 0 ? (
              <CalendarEmptyState
                title={rangeCountLabel}
                text={rangeEmptyText}
                actionLabel={copy.primaryAction}
                onCreate={() => openCreateForm(cursorDate)}
                onClear={hasActiveFilters ? clearFilters : undefined}
                disabled={Boolean(schemaError)}
              />
            ) : activeView === "month" ? (
                <MonthView
                  cursorDate={cursorDate}
                  entriesByDay={entriesByDay}
                  rangeCountLabel={rangeCountLabel}
                  offeringTitleById={offeringTitleById}
                  onCreate={openCreateForm}
                  onEdit={openEditForm}
                />
              ) : activeView === "week" ? (
                <WeekView
                  cursorDate={cursorDate}
                  entriesByDay={entriesByDay}
                  rangeCountLabel={rangeCountLabel}
                  offeringTitleById={offeringTitleById}
                  onCreate={openCreateForm}
                  onEdit={openEditForm}
                />
              ) : (
                <DayView
                  cursorDate={cursorDate}
                  entriesByDay={entriesByDay}
                  rangeCountLabel={rangeCountLabel}
                  offeringTitleById={offeringTitleById}
                  onCreate={openCreateForm}
                  onEdit={openEditForm}
                />
            )}
          </div>
        </section>

        <aside className="grid min-w-0 gap-4">
          <div className="hidden md:block">
            <EntryForm
              idPrefix="calendar-entry-desktop"
              headingId="calendar-entry-desktop-title"
              form={form}
              copy={copy}
              offeringCopy={offeringCopy}
              offerings={offerings}
              conflicts={formConflicts}
              availabilityWarning={availabilityWarning}
              lifecycleHistory={formLifecycleHistory}
              changeRequests={formChangeRequests}
              lifecycleUnavailable={lifecycleUnavailable}
              isSaving={isPending}
              disabled={Boolean(schemaError)}
              onChange={setForm}
              onCancel={() => setForm(null)}
              onSubmit={submitForm}
              onStatusChange={changeEntryStatus}
              onProposeAlternative={proposeAlternative}
              onResolveReschedule={resolveRescheduleRequest}
              onDelete={deleteEntry}
            />
            {formEntry ? (
              <div className="mt-4">
                <BookingFinancePanel
                  idPrefix="calendar-finance-desktop"
                  entry={formEntry}
                  offering={formOffering}
                  financial={formFinancial}
                  invoices={formInvoices}
                  profile={initialBookingFinance.profile}
                  unavailable={bookingFinanceUnavailable}
                  onFinancialChange={(financial: ReservationFinancial) => setReservationFinancials((current) => [financial, ...current.filter((item) => item.calendar_entry_id !== financial.calendar_entry_id)])}
                  onInvoicesChange={(nextInvoices: BookingInvoice[]) => setBookingInvoices((current) => [...current.filter((invoice) => invoice.calendar_entry_id !== formEntry.id), ...nextInvoices])}
                />
              </div>
            ) : null}
          </div>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{copy.upcomingTitle}</h2>
                  <p className="text-xs text-muted-foreground">{upcomingRuleText}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {formatItemCount(upcomingEntries.length, "komend")}
                </span>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {upcomingEntries.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <p>{upcomingEmptyText}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCursorDate(new Date())}>
                      Vandaag bekijken
                    </Button>
                    {hasActiveFilters ? (
                      <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                        Filters wissen
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                upcomingEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined}
                    onClick={() => openEditForm(entry)}
                  />
                ))
              )}
            </div>
          </section>

          <AvailabilityPanel
            form={availabilityForm}
            windows={availabilityWindows}
            offerings={offerings}
            offeringCopy={offeringCopy}
            disabled={Boolean(schemaError) || isPending}
            onChange={setAvailabilityForm}
            onCreate={createAvailabilityWindow}
            onDelete={deleteAvailabilityWindow}
          />

          {/* External-calendar controls are intentionally hidden until this feature is ready to launch.
          <CalendarSyncPanel
            businessId={businessId}
            initialData={initialCalendarSync}
            unavailable={calendarSyncUnavailable}
          />
          */}
        </aside>
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 md:hidden" role="dialog" aria-modal="true" aria-labelledby="calendar-entry-mobile-title">
          <div className="absolute inset-0" onClick={() => setForm(null)} aria-hidden="true" />
          <div className="relative max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-background shadow-2xl">
            <EntryForm
              idPrefix="calendar-entry-mobile"
              headingId="calendar-entry-mobile-title"
              form={form}
              copy={copy}
              offeringCopy={offeringCopy}
              offerings={offerings}
              conflicts={formConflicts}
              availabilityWarning={availabilityWarning}
              lifecycleHistory={formLifecycleHistory}
              changeRequests={formChangeRequests}
              lifecycleUnavailable={lifecycleUnavailable}
              isSaving={isPending}
              disabled={Boolean(schemaError)}
              onChange={setForm}
              onCancel={() => setForm(null)}
              onSubmit={submitForm}
              onStatusChange={changeEntryStatus}
              onProposeAlternative={proposeAlternative}
              onResolveReschedule={resolveRescheduleRequest}
              onDelete={deleteEntry}
            />
            {formEntry ? (
              <div className="p-4 pt-0">
                <BookingFinancePanel
                  idPrefix="calendar-finance-mobile"
                  entry={formEntry}
                  offering={formOffering}
                  financial={formFinancial}
                  invoices={formInvoices}
                  profile={initialBookingFinance.profile}
                  unavailable={bookingFinanceUnavailable}
                  onFinancialChange={(financial: ReservationFinancial) => setReservationFinancials((current) => [financial, ...current.filter((item) => item.calendar_entry_id !== financial.calendar_entry_id)])}
                  onInvoicesChange={(nextInvoices: BookingInvoice[]) => setBookingInvoices((current) => [...current.filter((invoice) => invoice.calendar_entry_id !== formEntry.id), ...nextInvoices])}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterPanel({
  filters,
  offerings,
  offeringCopy,
  resultLabel,
  hasActiveFilters,
  isMobileOpen,
  onMobileOpenChange,
  onChange,
  onClear,
}: {
  filters: CalendarFilterState
  offerings: Service[]
  offeringCopy: CalendarClientProps["offeringCopy"]
  resultLabel: string
  hasActiveFilters: boolean
  isMobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  onChange: (filters: CalendarFilterState) => void
  onClear: () => void
}) {
  const activeFilterLabels = [
    filters.query.trim() ? `Zoeken: ${filters.query.trim()}` : null,
    filters.status !== "all" ? STATUS_LABELS[filters.status] : null,
    filters.serviceId === "unlinked"
      ? "Geen koppeling"
      : filters.serviceId !== "all"
        ? offerings.find((offering) => offering.id === filters.serviceId)?.title ?? offeringCopy.singular
        : null,
    filters.source !== "all" ? SOURCE_LABELS[filters.source] : null,
    filters.dateFrom ? `Vanaf ${filters.dateFrom}` : null,
    filters.dateTo ? `Tot ${filters.dateTo}` : null,
  ].filter(Boolean)
  const filterSummary = activeFilterLabels.length > 0 ? activeFilterLabels.join(" / ") : "Alle items"

  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Filters</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {resultLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onMobileOpenChange(!isMobileOpen)} className="sm:hidden">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Filters wissen
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 break-words rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground sm:hidden">
        {filterSummary}
      </div>

      <div className={`${isMobileOpen ? "grid" : "hidden"} gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-6`}>
        <div className="grid gap-1.5 sm:col-span-2 xl:col-span-1">
          <Label htmlFor="calendar-filter-query">Zoeken</Label>
          <Input
            id="calendar-filter-query"
            type="search"
            value={filters.query}
            placeholder="Naam, reserverings- of factuurnummer"
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calendar-filter-status">Status</Label>
          <select
            id="calendar-filter-status"
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as CalendarFilterState["status"] })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all">Alle statussen</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="calendar-filter-offering">{offeringCopy.singular[0].toUpperCase()}{offeringCopy.singular.slice(1)}</Label>
          <select
            id="calendar-filter-offering"
            value={filters.serviceId}
            onChange={(event) => onChange({ ...filters, serviceId: event.target.value as CalendarFilterState["serviceId"] })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all">Alle {offeringCopy.plural.toLowerCase()}</option>
            <option value="unlinked">Geen koppeling</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="calendar-filter-source">Bron</Label>
          <select
            id="calendar-filter-source"
            value={filters.source}
            onChange={(event) => onChange({ ...filters, source: event.target.value as CalendarFilterState["source"] })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all">Alle bronnen</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="calendar-filter-from">Vanaf</Label>
          <Input
            id="calendar-filter-from"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="calendar-filter-to">Tot en met</Label>
          <Input
            id="calendar-filter-to"
            type="date"
            value={filters.dateTo}
            onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
          />
        </div>
      </div>
    </section>
  )
}

function CalendarEmptyState({
  title,
  text,
  actionLabel,
  disabled,
  onCreate,
  onClear,
}: {
  title: string
  text: string
  actionLabel: string
  disabled: boolean
  onCreate: () => void
  onClear?: () => void
}) {
  return (
    <div className="grid min-h-[24rem] place-items-center rounded-lg border border-dashed border-border bg-background p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {onClear ? (
            <Button type="button" variant="outline" onClick={onClear}>
              Filters wissen
            </Button>
          ) : null}
          <Button type="button" onClick={onCreate} disabled={disabled}>
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, shortLabel, value, tone, active, onClick }: { label: string; shortLabel: string; value: number; tone: CalendarEntryStatus; active: boolean; onClick: () => void }) {
  const iconClass =
    tone === "pending" ? "text-amber-600" : tone === "confirmed" ? "text-emerald-600" : "text-zinc-600"

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 rounded-lg border bg-card p-2.5 text-left shadow-sm transition-colors hover:border-primary/50 md:p-4 ${active ? "border-primary ring-2 ring-primary/15" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium text-muted-foreground md:text-xs md:uppercase">
            <span className="md:hidden">{shortLabel}</span>
            <span className="hidden md:inline">{label}</span>
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground md:mt-2 md:text-2xl">{value}</p>
        </div>
        <Clock className={`hidden h-5 w-5 sm:block ${iconClass}`} />
      </div>
    </button>
  )
}

function MonthView({
  cursorDate,
  entriesByDay,
  rangeCountLabel,
  offeringTitleById,
  onCreate,
  onEdit,
}: {
  cursorDate: Date
  entriesByDay: Map<string, CalendarEntry[]>
  rangeCountLabel: string
  offeringTitleById: Map<string, string>
  onCreate: (date: Date) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  const first = startOfMonthGrid(cursorDate)
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index))
  const [selectedDayKey, setSelectedDayKey] = useState(() => dateKey(cursorDate))

  useEffect(() => {
    const selectedDate = new Date(`${selectedDayKey}T12:00:00`)
    if (selectedDate.getMonth() !== cursorDate.getMonth() || selectedDate.getFullYear() !== cursorDate.getFullYear()) {
      setSelectedDayKey(dateKey(new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1)))
    }
  }, [cursorDate, selectedDayKey])

  const selectedDay = new Date(`${selectedDayKey}T12:00:00`)
  const selectedDayEntries = entriesByDay.get(selectedDayKey) ?? []

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold capitalize text-foreground">{formatMonthLabel(cursorDate)}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{rangeCountLabel}</span>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-b border-border bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = dateKey(day)
          const dayEntries = entriesByDay.get(key) ?? []
          const isCurrentMonth = day.getMonth() === cursorDate.getMonth()
          const isToday = isSameDay(day, new Date())
          const addLabel = `Toevoegen op ${formatDayLabel(day)}`

          return (
            <div
              key={key}
              className={`min-h-16 min-w-0 border-b border-r border-border p-0.5 text-left align-top transition-colors hover:bg-primary/5 sm:min-h-28 sm:p-2 ${
                isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"
              } ${selectedDayKey === key ? "bg-primary/5 sm:bg-background" : ""}`}
            >
              <button
                type="button"
                onClick={() => dayEntries.length > 0 ? setSelectedDayKey(key) : onCreate(day)}
                aria-label={dayEntries.length > 0 ? `${formatDayLabel(day)}, ${formatItemCount(dayEntries.length, "gepland")}` : addLabel}
                title={dayEntries.length > 0 ? `${formatItemCount(dayEntries.length, "gepland")} op ${formatDayLabel(day)}` : addLabel}
                className={`flex h-10 w-full items-center justify-between gap-1 rounded-md px-1.5 text-xs font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:hidden ${
                  isToday ? "bg-primary text-primary-foreground hover:bg-primary" : ""
                }`}
              >
                <span>{day.getDate()}</span>
                {dayEntries.length > 0 ? (
                  <span className="flex max-w-[2rem] items-center gap-0.5" aria-hidden="true">
                    {dayEntries.slice(0, 2).map((entry) => <span key={entry.id} className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : STATUS_DOT_STYLES[entry.status]}`} />)}
                    {dayEntries.length > 2 ? <span className="text-[9px]">+{dayEntries.length - 2}</span> : null}
                  </span>
                ) : <Plus className="h-3.5 w-3.5 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => onCreate(day)}
                aria-label={addLabel}
                title={addLabel}
                className={`hidden h-10 w-full items-center justify-between gap-1 rounded-md px-2 text-xs font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex ${
                  isToday ? "bg-primary text-primary-foreground hover:bg-primary" : ""
                }`}
              >
                <span>{day.getDate()}</span>
                <Plus className="h-3.5 w-3.5 shrink-0" />
              </button>
              <div className="mt-2 hidden space-y-1 sm:block">
                {dayEntries.slice(0, 3).map((entry) => (
                  <EntryPill
                    key={entry.id}
                    entry={entry}
                    displayDay={day}
                    offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined}
                    onClick={onEdit}
                  />
                ))}
                {dayEntries.length > 3 ? (
                  <div className="text-[10px] font-medium text-muted-foreground">+{dayEntries.length - 3} meer</div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      <section className="mt-3 rounded-lg border border-border bg-background p-3 sm:hidden" aria-label={`Planning voor ${formatDayLabel(selectedDay)}`}>
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold capitalize text-foreground">{formatDayLabel(selectedDay)}</h4>
            <p className="text-xs text-muted-foreground">{formatItemCount(selectedDayEntries.length, "gepland")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onCreate(selectedDay)}>
            <Plus className="h-4 w-4" />
            Toevoegen
          </Button>
        </div>
        {selectedDayEntries.length > 0 ? (
          <div className="space-y-2">
            {selectedDayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined} onClick={() => onEdit(entry)} />
            ))}
          </div>
        ) : <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Geen items op deze dag.</p>}
      </section>
    </div>
  )
}

function WeekView({
  cursorDate,
  entriesByDay,
  rangeCountLabel,
  offeringTitleById,
  onCreate,
  onEdit,
}: {
  cursorDate: Date
  entriesByDay: Map<string, CalendarEntry[]>
  rangeCountLabel: string
  offeringTitleById: Map<string, string>
  onCreate: (date: Date, hour?: number) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  const first = startOfWeek(cursorDate)
  const days = Array.from({ length: 7 }, (_, index) => addDays(first, index))

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Week van {formatDayLabel(first)}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{rangeCountLabel}</span>
      </div>

      <div className="grid gap-3 md:hidden">
        {days.map((day) => {
          const dayEntries = [...(entriesByDay.get(dateKey(day)) ?? [])].sort(
            (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
          )

          return (
            <section key={dateKey(day)} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold capitalize text-foreground">{formatDayLabel(day)}</h4>
                  <p className="text-xs text-muted-foreground">
                    {dayEntries.length === 0
                      ? "Geen items gepland"
                      : `${dayEntries.length} ${dayEntries.length === 1 ? "item" : "items"}`}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => onCreate(day, 9)} className="shrink-0">
                  <Plus className="h-4 w-4" />
                  09:00
                </Button>
              </div>

              {dayEntries.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {dayEntries.map((entry) => (
                    <EntryPill
                      key={entry.id}
                      entry={entry}
                      displayDay={day}
                      offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined}
                      onClick={onEdit}
                    />
                  ))}
                </div>
              ) : null}

              <details className="mt-3 rounded-md border border-dashed border-border">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Ander tijdstip kiezen
                </summary>
                <div className="grid grid-cols-3 gap-2 border-t border-border p-2">
                  {DAY_HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => onCreate(day, hour)}
                      aria-label={`${formatDayLabel(day)} om ${String(hour).padStart(2, "0")}:00 toevoegen`}
                      className="min-h-10 rounded-md border border-border bg-card px-2 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {String(hour).padStart(2, "0")}:00
                    </button>
                  ))}
                </div>
              </details>
            </section>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[760px] grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] overflow-hidden rounded-lg border border-border">
          <div className="border-b border-r border-border bg-muted p-2 text-xs font-medium text-muted-foreground">Tijd</div>
          {days.map((day) => (
            <div key={dateKey(day)} className="border-b border-r border-border bg-muted p-2 text-center">
              <p className="text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</p>
              <p className="text-sm font-semibold text-foreground">{day.getDate()}</p>
            </div>
          ))}
          <div className="border-b border-r border-border bg-muted/40 p-2 text-xs text-muted-foreground">Hele dag</div>
          {days.map((day) => {
            const continuingEntries = (entriesByDay.get(dateKey(day)) ?? []).filter((entry) => entry.all_day || !isSameDay(new Date(entry.start_at), day))
            return (
              <div key={`${dateKey(day)}-all-day`} className="min-h-16 border-b border-r border-border bg-background p-1.5">
                <div className="space-y-1">
                  {continuingEntries.map((entry) => (
                    <EntryPill key={entry.id} entry={entry} displayDay={day} offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined} onClick={onEdit} />
                  ))}
                </div>
              </div>
            )
          })}
          {DAY_HOURS.map((hour) => (
            <Fragment key={hour}>
              <div className="border-b border-r border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((day) => {
                const entries = (entriesByDay.get(dateKey(day)) ?? []).filter((entry) => !entry.all_day && isSameDay(new Date(entry.start_at), day) && new Date(entry.start_at).getHours() === hour)

                return (
                  <div
                    key={`${dateKey(day)}-${hour}`}
                    className="min-h-20 border-b border-r border-border bg-background p-1.5 text-left transition-colors hover:bg-primary/5"
                  >
                    <div className="space-y-1">
                      {entries.map((entry) => (
                        <EntryPill
                          key={entry.id}
                          entry={entry}
                          displayDay={day}
                          offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined}
                          onClick={onEdit}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => onCreate(day, hour)}
                        className="block w-full rounded border border-dashed border-transparent px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
                      >
                        Toevoegen
                      </button>
                    </div>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayView({
  cursorDate,
  entriesByDay,
  rangeCountLabel,
  offeringTitleById,
  onCreate,
  onEdit,
}: {
  cursorDate: Date
  entriesByDay: Map<string, CalendarEntry[]>
  rangeCountLabel: string
  offeringTitleById: Map<string, string>
  onCreate: (date: Date, hour?: number) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  const dayEntries = entriesByDay.get(dateKey(cursorDate)) ?? []
  const continuingEntries = dayEntries.filter((entry) => entry.all_day || !isSameDay(new Date(entry.start_at), cursorDate))

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold capitalize text-foreground">{formatDayLabel(cursorDate)}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{rangeCountLabel}</span>
      </div>
      {continuingEntries.length > 0 ? (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Hele dag en doorlopend</p>
          <div className="space-y-2">
            {continuingEntries.map((entry) => (
              <EntryPill key={entry.id} entry={entry} displayDay={cursorDate} offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined} onClick={onEdit} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border">
        {DAY_HOURS.map((hour) => {
          const entries = dayEntries.filter((entry) => !entry.all_day && isSameDay(new Date(entry.start_at), cursorDate) && new Date(entry.start_at).getHours() === hour)
          return (
            <div
              key={hour}
              className="grid min-h-20 w-full grid-cols-[4.5rem_minmax(0,1fr)] border-b border-border text-left transition-colors hover:bg-primary/5"
            >
              <div className="border-r border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="space-y-1 p-2">
                {entries.map((entry) => (
                  <EntryPill
                    key={entry.id}
                    entry={entry}
                    displayDay={cursorDate}
                    offeringTitle={entry.service_id ? offeringTitleById.get(entry.service_id) : undefined}
                    onClick={onEdit}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => onCreate(cursorDate, hour)}
                  className="block w-full rounded border border-dashed border-transparent px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
                >
                  Klik om toe te voegen
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EntryPill({
  entry,
  displayDay,
  offeringTitle,
  onClick,
}: {
  entry: CalendarEntry
  displayDay?: Date
  offeringTitle?: string
  onClick: (entry: CalendarEntry) => void
}) {
  const detailText = [entry.customer_name, offeringTitle].filter(Boolean).join(" / ")
  const dayPhase = displayDay ? getEntryDayPhase(entry, displayDay) : null

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick(entry)
      }}
      className={`block w-full rounded border px-2 py-1 text-left text-[11px] font-medium ${STATUS_STYLES[entry.status]}`}
    >
      <span className="block truncate">
        {dayPhase || formatEntryTime(entry)} / {STATUS_LABELS[entry.status]} / {entry.title || STATUS_LABELS[entry.status]}
      </span>
      {detailText ? <span className="block truncate text-[10px] opacity-80">{detailText}</span> : null}
    </button>
  )
}

function EntryCard({
  entry,
  offeringTitle,
  onClick,
}: {
  entry: CalendarEntry
  offeringTitle?: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">{entry.title || STATUS_LABELS[entry.status]}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatEntryRange(entry)}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[entry.status]}`}>
          {STATUS_LABELS[entry.status]}
        </span>
      </div>
      {entry.customer_name ? <p className="text-xs text-muted-foreground">{entry.customer_name}</p> : null}
      {offeringTitle ? <p className="text-xs text-muted-foreground">{offeringTitle}</p> : null}
    </button>
  )
}

function AvailabilityPanel({
  form,
  windows,
  offerings,
  offeringCopy,
  disabled,
  onChange,
  onCreate,
  onDelete,
}: {
  form: AvailabilityFormState
  windows: CalendarAvailabilityWindow[]
  offerings: Service[]
  offeringCopy: CalendarClientProps["offeringCopy"]
  disabled: boolean
  onChange: (form: AvailabilityFormState) => void
  onCreate: () => void
  onDelete: (windowId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = (windowId: string) => {
    onDelete(windowId)
    setConfirmDeleteId(null)
  }

  return (
    <section className="min-w-0 rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">Beschikbaarheidsinstellingen</span>
          <span className="mt-1 block text-xs text-muted-foreground sm:whitespace-normal">
            Vaste openingstijden staan los van de dagelijkse afsprakenlijst.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="sm:hidden">{windows.length}</span>
          <span className="hidden sm:inline">{formatItemCount(windows.length, "ingesteld")}</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </span>
      </button>
      <div className={`${isOpen ? "grid" : "hidden"} gap-3 border-t border-border p-4`}>
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Gebruik dit alleen voor vaste weekregels. Nieuwe afspraken, boekingen en aanvragen blijven bovenaan in de planning staan.
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="availability-service">{offeringCopy.singular[0].toUpperCase()}{offeringCopy.singular.slice(1)}</Label>
          <select
            id="availability-service"
            value={form.service_id}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, service_id: event.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Alle {offeringCopy.plural.toLowerCase()}</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_0.75fr_0.75fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="availability-weekday">Dag</Label>
            <select
              id="availability-weekday"
              value={form.weekday}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, weekday: event.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {WEEKDAY_FULL_LABELS.map((label, index) => (
                <option key={label} value={String(index + 1)}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="availability-start">Van</Label>
            <Input
              id="availability-start"
              type="time"
              value={form.start_time}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, start_time: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="availability-end">Tot</Label>
            <Input
              id="availability-end"
              type="time"
              value={form.end_time}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, end_time: event.target.value })}
            />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onCreate} disabled={disabled}>
          <Plus className="h-4 w-4" />
          Beschikbaarheid toevoegen
        </Button>

        <div className="space-y-2 pt-1">
          {windows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              Nog geen vaste beschikbaarheid ingesteld.
            </div>
          ) : (
            windows.map((window) => {
              const offeringTitle = window.service_id
                ? offerings.find((offering) => offering.id === window.service_id)?.title
                : null

              return (
                <div key={window.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {WEEKDAY_FULL_LABELS[window.weekday - 1]} {window.start_time.slice(0, 5)} - {window.end_time.slice(0, 5)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {offeringTitle || `Alle ${offeringCopy.plural.toLowerCase()}`}
                    </p>
                  </div>
                  {confirmDeleteId === window.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="ghost" size="xs" onClick={() => setConfirmDeleteId(null)} disabled={disabled}>
                        Annuleren
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDelete(window.id)}
                        disabled={disabled}
                      >
                        Verwijderen
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDeleteId(window.id)}
                      disabled={disabled}
                      aria-label={`Beschikbaarheid op ${WEEKDAY_FULL_LABELS[window.weekday - 1].toLowerCase()} verwijderen`}
                      title={`Beschikbaarheid op ${WEEKDAY_FULL_LABELS[window.weekday - 1].toLowerCase()} verwijderen`}
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Verwijderen
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

function EntryForm({
  idPrefix,
  headingId,
  form,
  copy,
  offeringCopy,
  offerings,
  conflicts,
  availabilityWarning,
  lifecycleHistory,
  changeRequests,
  lifecycleUnavailable,
  isSaving,
  disabled,
  onChange,
  onCancel,
  onSubmit,
  onStatusChange,
  onProposeAlternative,
  onResolveReschedule,
  onDelete,
}: {
  idPrefix: string
  headingId: string
  form: EntryFormState | null
  copy: CalendarClientProps["copy"]
  offeringCopy: CalendarClientProps["offeringCopy"]
  offerings: Service[]
  conflicts: CalendarEntry[]
  availabilityWarning: string | null
  lifecycleHistory: BookingHistoryItem[]
  changeRequests: BookingChangeRequest[]
  lifecycleUnavailable: boolean
  isSaving: boolean
  disabled: boolean
  onChange: (form: EntryFormState) => void
  onCancel: () => void
  onSubmit: () => void
  onStatusChange: (entryId: string, status: CalendarEntryStatus, privateNote?: string) => void
  onProposeAlternative: (entryId: string, input: { startAt: string; endAt: string; customerMessage: string; privateNote: string }) => void
  onResolveReschedule: (requestId: string, accept: boolean, privateNote?: string) => void
  onDelete: (entryId: string) => void
}) {
  const [lifecyclePrivateNote, setLifecyclePrivateNote] = useState("")
  const [proposalStart, setProposalStart] = useState(form?.start_at ?? "")
  const [proposalEnd, setProposalEnd] = useState(form?.end_at ?? "")
  const [proposalMessage, setProposalMessage] = useState("")
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(!form?.id)
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const fieldId = (name: string) => `${idPrefix}-${name}`

  useEffect(() => {
    setLifecyclePrivateNote("")
    setProposalStart(form?.start_at ?? "")
    setProposalEnd(form?.end_at ?? "")
    setProposalMessage("")
  }, [form?.id, form?.start_at, form?.end_at])

  useEffect(() => {
    setCustomerDetailsOpen(!form?.id)
    setDeleteConfirmationOpen(false)
  }, [form?.id])

  if (!form) {
    return (
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="grid min-h-56 place-items-center text-center">
          <div>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-foreground">{copy.primaryAction}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Klik op een dag of tijdslot om een item aan te maken.</p>
          </div>
        </div>
      </section>
    )
  }

  const isOnlineBooking = form.metadata?.source === "booking_engine"
  const openCustomerRequests = changeRequests.filter((request) => request.status === "pending" && request.requested_by === "customer")

  const propose = () => {
    const start = new Date(proposalStart)
    const end = new Date(proposalEnd)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return
    onProposeAlternative(form.id!, {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      customerMessage: proposalMessage,
      privateNote: lifecyclePrivateNote,
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 id={headingId} className="font-semibold text-foreground">{form.id ? "Kalenderitem bewerken" : copy.primaryAction}</h2>
          <p className="text-xs text-muted-foreground">Wijzig titel, tijd, status en gekoppeld aanbod.</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Formulier sluiten" title="Formulier sluiten">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-4 p-4">
        {form.id && form.status === "pending" ? (
          <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">Deze aanvraag wacht op bevestiging.</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => onStatusChange(form.id!, "confirmed", lifecyclePrivateNote)} disabled={disabled || isSaving || (isOnlineBooking && lifecycleUnavailable)}>
                Accepteren
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onStatusChange(form.id!, "cancelled", lifecyclePrivateNote)} disabled={disabled || isSaving || (isOnlineBooking && lifecycleUnavailable)}>
                Afwijzen
              </Button>
            </div>
          </div>
        ) : null}
        {isOnlineBooking ? (
          <details className="min-w-0 overflow-hidden rounded-md border border-primary/20 bg-primary/5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-foreground">
              <span>Boekingsverloop en historie</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">{formatItemCount(lifecycleHistory.length, "vastgelegd")}</span>
            </summary>
            <div className="space-y-4 border-t border-primary/15 p-3">
              <p className="text-xs text-muted-foreground">Klantmeldingen bevatten nooit de interne notitie hieronder.</p>
            {lifecycleUnavailable ? (
              <p className="rounded-md border border-dashed border-border bg-background p-2 text-xs text-muted-foreground">Voer de Phase 3-migratie uit om statusgeschiedenis en klantacties te gebruiken.</p>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor={fieldId("booking-lifecycle-private-note")}>Interne actienotitie</Label>
              <Textarea id={fieldId("booking-lifecycle-private-note")} rows={2} maxLength={2000} value={lifecyclePrivateNote} onChange={(event) => setLifecyclePrivateNote(event.target.value)} placeholder="Alleen zichtbaar voor de eigenaar" />
            </div>

            {openCustomerRequests.map((request) => (
              <div key={request.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-semibold">Klant vraagt een ander tijdstip</p>
                <p className="mt-1">{formatEntryRange({ ...form, id: form.id!, business_id: "", service_id: form.service_id || null, contact_request_id: form.contact_request_id, source: form.source, created_at: request.created_at, updated_at: request.created_at, start_at: request.proposed_start_at, end_at: request.proposed_end_at } as CalendarEntry)}</p>
                {request.customer_message ? <p className="mt-1 text-xs">{request.customer_message}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={disabled || isSaving || lifecycleUnavailable} onClick={() => onResolveReschedule(request.id, true, lifecyclePrivateNote)}>Toepassen</Button>
                  <Button type="button" size="sm" variant="outline" disabled={disabled || isSaving || lifecycleUnavailable} onClick={() => onResolveReschedule(request.id, false, lifecyclePrivateNote)}>Afwijzen</Button>
                </div>
              </div>
            ))}

            {form.status === "pending" || form.status === "confirmed" ? (
              <details className="rounded-md border border-border bg-background p-3">
                <summary className="cursor-pointer text-sm font-semibold">Alternatief tijdstip voorstellen</summary>
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor={fieldId("booking-proposal-start")}>Start</Label><Input id={fieldId("booking-proposal-start")} className="mt-1" type="datetime-local" value={proposalStart} onChange={(event) => setProposalStart(event.target.value)} /></div>
                    <div><Label htmlFor={fieldId("booking-proposal-end")}>Einde</Label><Input id={fieldId("booking-proposal-end")} className="mt-1" type="datetime-local" value={proposalEnd} onChange={(event) => setProposalEnd(event.target.value)} /></div>
                  </div>
                  <div><Label htmlFor={fieldId("booking-proposal-message")}>Bericht aan klant</Label><Textarea id={fieldId("booking-proposal-message")} className="mt-1" rows={2} maxLength={1000} value={proposalMessage} onChange={(event) => setProposalMessage(event.target.value)} /></div>
                  <Button type="button" variant="outline" disabled={disabled || isSaving || lifecycleUnavailable || !proposalStart || !proposalEnd} onClick={propose}>Voorstel versturen</Button>
                </div>
              </details>
            ) : null}

            {lifecycleHistory.length > 0 ? (
              <ol className="space-y-2 border-t border-primary/15 pt-3">
                {lifecycleHistory.map((item) => (
                  <li key={item.id} className="rounded-md bg-background p-2 text-xs">
                    <div className="flex justify-between gap-2"><span className="font-semibold capitalize">{item.event_type.replaceAll("_", " ")}</span><time className="text-muted-foreground">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</time></div>
                    {item.public_message ? <p className="mt-1 text-muted-foreground">Klantbericht: {item.public_message}</p> : null}
                    {item.private_note ? <p className="mt-1 text-muted-foreground">Intern: {item.private_note}</p> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            </div>
          </details>
        ) : null}
        {conflicts.length > 0 || availabilityWarning ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Controleer deze planning voor opslaan.</p>
                {availabilityWarning ? <p className="mt-1">{availabilityWarning}</p> : null}
                {conflicts.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc">
                    {conflicts.slice(0, 3).map((entry) => (
                      <li key={entry.id}>
                        Conflict met {entry.title || STATUS_LABELS[entry.status]} ({formatEntryRange(entry)})
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor={fieldId("calendar-title")}>Titel</Label>
          <Input
            id={fieldId("calendar-title")}
            value={form.title}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={fieldId("calendar-type")}>Type</Label>
            <select
              id={fieldId("calendar-type")}
              value={form.entry_type}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, entry_type: event.target.value as CalendarEntryType })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="appointment">Afspraak</option>
              <option value="booking">Boeking</option>
              <option value="blocked">Geblokkeerd</option>
              <option value="note">Notitie</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={fieldId("calendar-status")}>Status</Label>
            <select
              id={fieldId("calendar-status")}
              value={form.status}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, status: event.target.value as CalendarEntryStatus })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={fieldId("calendar-service")}>{offeringCopy.singular[0].toUpperCase()}{offeringCopy.singular.slice(1)}</Label>
          <select
            id={fieldId("calendar-service")}
            value={form.service_id}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, service_id: event.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Geen koppeling</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={fieldId("calendar-start")}>Start</Label>
            <Input
              id={fieldId("calendar-start")}
              type="datetime-local"
              value={form.start_at}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, start_at: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={fieldId("calendar-end")}>Einde</Label>
            <Input
              id={fieldId("calendar-end")}
              type="datetime-local"
              value={form.end_at}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, end_at: event.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={form.all_day}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, all_day: event.target.checked })}
          />
          Hele dag
        </label>
        <details className="min-w-0 overflow-hidden rounded-md border border-border bg-background" open={customerDetailsOpen} onToggle={(event) => setCustomerDetailsOpen(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-foreground">
            <span>Klantgegevens en notities</span>
            <span className="max-w-[50%] truncate text-xs font-normal text-muted-foreground">{form.customer_name || "Nog niet ingevuld"}</span>
          </summary>
          <div className="grid gap-3 border-t border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={fieldId("calendar-name")}>Klantnaam</Label>
                <Input id={fieldId("calendar-name")} value={form.customer_name} disabled={disabled} onChange={(event) => onChange({ ...form, customer_name: event.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={fieldId("calendar-phone")}>Telefoon</Label>
                <Input id={fieldId("calendar-phone")} value={form.customer_phone} disabled={disabled} onChange={(event) => onChange({ ...form, customer_phone: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={fieldId("calendar-email")}>E-mail</Label>
              <Input id={fieldId("calendar-email")} value={form.customer_email} disabled={disabled} onChange={(event) => onChange({ ...form, customer_email: event.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={fieldId("calendar-notes")}>Interne notities</Label>
              <Textarea id={fieldId("calendar-notes")} rows={3} value={form.internal_notes} disabled={disabled} onChange={(event) => onChange({ ...form, internal_notes: event.target.value })} />
            </div>
          </div>
        </details>
        {form.id ? (
          <details className="min-w-0 overflow-hidden rounded-md border border-border bg-background">
            <summary className="cursor-pointer px-3 py-3 text-sm font-medium text-muted-foreground">Geavanceerde acties</summary>
            <div className="border-t border-border p-3">
              {deleteConfirmationOpen ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
                  <p className="font-medium">Dit kalenderitem definitief verwijderen?</p>
                  <p className="mt-1 text-xs">Deze actie kan niet ongedaan worden gemaakt.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirmationOpen(false)} disabled={isSaving}>Annuleren</Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(form.id!)} disabled={disabled || isSaving}>
                      <Trash2 className="h-4 w-4" /> Definitief verwijderen
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirmationOpen(true)} disabled={disabled || isSaving} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Kalenderitem verwijderen
                </Button>
              )}
            </div>
          </details>
        ) : null}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 grid grid-cols-2 gap-2 border-t border-border bg-card p-4 md:static md:m-0 md:flex md:justify-end md:border-0 md:bg-transparent md:p-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Annuleren
          </Button>
          <Button type="button" onClick={onSubmit} disabled={disabled || isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </div>
    </section>
  )
}
