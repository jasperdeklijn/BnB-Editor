"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import { AlertTriangle, Ban, CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Save, Trash2, X } from "lucide-react"
import {
  createAvailabilityWindowAction,
  createCalendarEntryAction,
  deleteAvailabilityWindowAction,
  updateCalendarEntryAction,
} from "@/app/editor/calendar/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import { Textarea } from "@/components/ui/textarea"
import type {
  CalendarAvailabilityWindow,
  CalendarEntry,
  CalendarEntryStatus,
  CalendarEntryType,
} from "@/lib/supabase/calendar"
import type { Service } from "@/lib/supabase/services"
import type { BusinessCategory } from "@/lib/business/categories"

type CalendarView = "month" | "week" | "day"

interface CalendarClientProps {
  businessId: string
  businessCategory: BusinessCategory | string
  initialEntries: CalendarEntry[]
  initialAvailabilityWindows: CalendarAvailabilityWindow[]
  offerings: Service[]
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
}

type AvailabilityFormState = {
  service_id: string
  weekday: string
  start_time: string
  end_time: string
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

const STATUS_STYLES: Record<CalendarEntryStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cancelled: "border-red-200 bg-red-50 text-red-900",
  completed: "border-slate-200 bg-slate-50 text-slate-700",
  blocked: "border-zinc-300 bg-zinc-100 text-zinc-800",
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

function servicesOverlap(a: string | null | undefined, b: string | null | undefined) {
  return !a || !b || a === b
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
  }
}

function normalizeFormPayload(form: EntryFormState) {
  return {
    title: form.title,
    entry_type: form.entry_type,
    status: form.status,
    service_id: form.service_id || null,
    contact_request_id: null,
    source: "manual" as const,
    customer_name: form.customer_name,
    customer_email: form.customer_email,
    customer_phone: form.customer_phone,
    start_at: new Date(form.start_at).toISOString(),
    end_at: new Date(form.end_at).toISOString(),
    all_day: form.all_day,
    timezone: "Europe/Amsterdam",
    internal_notes: form.internal_notes,
    metadata: {},
  }
}

export function CalendarClient({
  businessId,
  businessCategory,
  initialEntries,
  initialAvailabilityWindows,
  offerings,
  schemaError,
  copy,
  offeringCopy,
}: CalendarClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [availabilityWindows, setAvailabilityWindows] = useState(initialAvailabilityWindows)
  const [activeView, setActiveView] = useState<CalendarView>("month")
  const [cursorDate, setCursorDate] = useState(() => new Date())
  const [form, setForm] = useState<EntryFormState | null>(null)
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>({
    service_id: "",
    weekday: "1",
    start_time: "09:00",
    end_time: "17:00",
  })
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>()
    for (const entry of entries) {
      const key = dateKey(new Date(entry.start_at))
      grouped.set(key, [...(grouped.get(key) ?? []), entry])
    }
    return grouped
  }, [entries])

  const offeringTitleById = useMemo(
    () => new Map(offerings.map((offering) => [offering.id, offering.title])),
    [offerings],
  )

  const upcomingEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.status !== "cancelled")
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        .slice(0, 6),
    [entries],
  )

  const pendingCount = entries.filter((entry) => entry.status === "pending").length
  const confirmedCount = entries.filter((entry) => entry.status === "confirmed").length
  const blockedCount = entries.filter((entry) => entry.status === "blocked").length
  const formConflicts = form ? getEntryConflicts(form, entries) : []
  const availabilityWarning = form ? getAvailabilityWarning(form, availabilityWindows) : null

  const openCreateForm = (date: Date, hour = 9) => {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    setForm(getDefaultFormState(businessCategory, start))
    setStatusMessage(null)
  }

  const openBlockedForm = (date: Date = cursorDate) => {
    setForm(getBlockedFormState(date))
    setStatusMessage(null)
  }

  const openEditForm = (entry: CalendarEntry) => {
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
      setStatusMessage({ tone: "error", text: "Titel is verplicht." })
      return
    }
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setStatusMessage({ tone: "error", text: "Eindtijd moet na starttijd liggen." })
      return
    }

    startTransition(async () => {
      const payload = normalizeFormPayload(form)
      const result = form.id
        ? await updateCalendarEntryAction(form.id, payload)
        : await createCalendarEntryAction(businessId, payload)

      if (!result.success) {
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
      setStatusMessage({ tone: "success", text: "Kalenderitem opgeslagen." })
    })
  }

  const changeEntryStatus = (entryId: string, status: CalendarEntryStatus) => {
    startTransition(async () => {
      const result = await updateCalendarEntryAction(entryId, { status })

      if (!result.success) {
        setStatusMessage({ tone: "error", text: result.error })
        return
      }

      setEntries((current) => current.map((entry) => (entry.id === result.entry.id ? result.entry : entry)))
      setForm((current) => (current?.id === result.entry.id ? formStateFromEntry(result.entry) : current))
      setStatusMessage({ tone: "success", text: status === "confirmed" ? "Aanvraag geaccepteerd." : "Aanvraag afgewezen." })
    })
  }

  const createAvailabilityWindow = () => {
    if (schemaError) return
    if (!availabilityForm.start_time || !availabilityForm.end_time || availabilityForm.end_time <= availabilityForm.start_time) {
      setStatusMessage({ tone: "error", text: "Eindtijd van beschikbaarheid moet na starttijd liggen." })
      return
    }

    startTransition(async () => {
      const result = await createAvailabilityWindowAction(businessId, {
        service_id: availabilityForm.service_id || null,
        weekday: Number(availabilityForm.weekday),
        start_time: availabilityForm.start_time,
        end_time: availabilityForm.end_time,
        timezone: "Europe/Amsterdam",
        is_active: true,
      })

      if (!result.success) {
        setStatusMessage({ tone: "error", text: result.error })
        return
      }

      setAvailabilityWindows((current) => [...current, result.window].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)))
      setStatusMessage({ tone: "success", text: "Beschikbaarheid opgeslagen." })
    })
  }

  const deleteAvailabilityWindow = (windowId: string) => {
    startTransition(async () => {
      const result = await deleteAvailabilityWindowAction(windowId)

      if (!result.success) {
        setStatusMessage({ tone: "error", text: result.error })
        return
      }

      setAvailabilityWindows((current) => current.filter((window) => window.id !== result.id))
      setStatusMessage({ tone: "success", text: "Beschikbaarheid verwijderd." })
    })
  }

  return (
    <div className="grid gap-4">
      {schemaError ? <StatusMessage tone="error">{schemaError}</StatusMessage> : null}
      {statusMessage ? <StatusMessage tone={statusMessage.tone}>{statusMessage.text}</StatusMessage> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="In afwachting" value={pendingCount} tone="pending" />
        <SummaryCard label="Bevestigd" value={confirmedCount} tone="confirmed" />
        <SummaryCard label="Geblokkeerd" value={blockedCount} tone="blocked" />
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">Kalenderoverzicht</h2>
              <p className="text-xs text-muted-foreground">{copy.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                {(["month", "week", "day"] as CalendarView[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
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
              <Button type="button" variant="outline" size="sm" onClick={() => moveCursor(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setCursorDate(new Date())}>
                Vandaag
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => moveCursor(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
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

          <div className="p-3 sm:p-4">
            {activeView === "month" ? (
              <MonthView
                cursorDate={cursorDate}
                entriesByDay={entriesByDay}
                offeringTitleById={offeringTitleById}
                onCreate={openCreateForm}
                onEdit={openEditForm}
              />
            ) : activeView === "week" ? (
              <WeekView
                cursorDate={cursorDate}
                entriesByDay={entriesByDay}
                offeringTitleById={offeringTitleById}
                onCreate={openCreateForm}
                onEdit={openEditForm}
              />
            ) : (
              <DayView
                cursorDate={cursorDate}
                entriesByDay={entriesByDay}
                offeringTitleById={offeringTitleById}
                onCreate={openCreateForm}
                onEdit={openEditForm}
              />
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <EntryForm
            form={form}
            copy={copy}
            offeringCopy={offeringCopy}
            offerings={offerings}
            conflicts={formConflicts}
            availabilityWarning={availabilityWarning}
            isSaving={isPending}
            disabled={Boolean(schemaError)}
            onChange={setForm}
            onCancel={() => setForm(null)}
            onSubmit={submitForm}
            onStatusChange={changeEntryStatus}
          />

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

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-semibold text-foreground">{copy.upcomingTitle}</h2>
              <p className="text-xs text-muted-foreground">Gekoppeld aan {offeringCopy.plural.toLowerCase()} waar mogelijk.</p>
            </div>
            <div className="space-y-3 p-4">
              {upcomingEntries.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Er staan nog geen kalenderitems klaar.
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
        </aside>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: CalendarEntryStatus }) {
  const iconClass =
    tone === "pending" ? "text-amber-600" : tone === "confirmed" ? "text-emerald-600" : "text-zinc-600"

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <Clock className={`h-5 w-5 ${iconClass}`} />
      </div>
    </div>
  )
}

function MonthView({
  cursorDate,
  entriesByDay,
  offeringTitleById,
  onCreate,
  onEdit,
}: {
  cursorDate: Date
  entriesByDay: Map<string, CalendarEntry[]>
  offeringTitleById: Map<string, string>
  onCreate: (date: Date) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  const first = startOfMonthGrid(cursorDate)
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index))

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold capitalize text-foreground">{formatMonthLabel(cursorDate)}</h3>
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

          return (
            <div
              key={key}
              className={`min-h-28 border-b border-r border-border p-2 text-left align-top transition-colors hover:bg-primary/5 ${
                isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded text-xs font-medium transition-colors hover:bg-primary/10 ${
                    isToday ? "bg-primary text-primary-foreground hover:bg-primary" : ""
                  }`}
                >
                  {day.getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  aria-label={`Toevoegen op ${day.getDate()}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {dayEntries.slice(0, 3).map((entry) => (
                  <EntryPill
                    key={entry.id}
                    entry={entry}
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
    </div>
  )
}

function WeekView({
  cursorDate,
  entriesByDay,
  offeringTitleById,
  onCreate,
  onEdit,
}: {
  cursorDate: Date
  entriesByDay: Map<string, CalendarEntry[]>
  offeringTitleById: Map<string, string>
  onCreate: (date: Date, hour?: number) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  const first = startOfWeek(cursorDate)
  const days = Array.from({ length: 7 }, (_, index) => addDays(first, index))

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] overflow-hidden rounded-lg border border-border">
        <div className="border-b border-r border-border bg-muted p-2 text-xs font-medium text-muted-foreground">Tijd</div>
        {days.map((day) => (
          <div key={dateKey(day)} className="border-b border-r border-border bg-muted p-2 text-center">
            <p className="text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</p>
            <p className="text-sm font-semibold text-foreground">{day.getDate()}</p>
          </div>
        ))}
        {DAY_HOURS.map((hour) => (
          <Fragment key={hour}>
            <div className="border-b border-r border-border bg-muted/40 p-2 text-xs text-muted-foreground">
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((day) => {
              const entries = (entriesByDay.get(dateKey(day)) ?? []).filter((entry) => new Date(entry.start_at).getHours() === hour)

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
  )
}

function DayView({
  cursorDate,
  entriesByDay,
  offeringTitleById,
  onCreate,
  onEdit,
}: {
  cursorDate: Date
  entriesByDay: Map<string, CalendarEntry[]>
  offeringTitleById: Map<string, string>
  onCreate: (date: Date, hour?: number) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  const dayEntries = entriesByDay.get(dateKey(cursorDate)) ?? []

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold capitalize text-foreground">{formatDayLabel(cursorDate)}</h3>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {DAY_HOURS.map((hour) => {
          const entries = dayEntries.filter((entry) => new Date(entry.start_at).getHours() === hour)
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
  offeringTitle,
  onClick,
}: {
  entry: CalendarEntry
  offeringTitle?: string
  onClick: (entry: CalendarEntry) => void
}) {
  const detailText = [entry.customer_name, offeringTitle].filter(Boolean).join(" / ")

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
        {formatEntryTime(entry)} / {STATUS_LABELS[entry.status]} / {entry.title || STATUS_LABELS[entry.status]}
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
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">Beschikbaarheid</h2>
        <p className="text-xs text-muted-foreground">Stel vaste openingstijden per dag en {offeringCopy.singular} in.</p>
      </div>
      <div className="grid gap-3 p-4">
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
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(window.id)} disabled={disabled}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
  form,
  copy,
  offeringCopy,
  offerings,
  conflicts,
  availabilityWarning,
  isSaving,
  disabled,
  onChange,
  onCancel,
  onSubmit,
  onStatusChange,
}: {
  form: EntryFormState | null
  copy: CalendarClientProps["copy"]
  offeringCopy: CalendarClientProps["offeringCopy"]
  offerings: Service[]
  conflicts: CalendarEntry[]
  availabilityWarning: string | null
  isSaving: boolean
  disabled: boolean
  onChange: (form: EntryFormState) => void
  onCancel: () => void
  onSubmit: () => void
  onStatusChange: (entryId: string, status: CalendarEntryStatus) => void
}) {
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

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-semibold text-foreground">{form.id ? "Kalenderitem bewerken" : copy.primaryAction}</h2>
          <p className="text-xs text-muted-foreground">Wijzig titel, tijd, status en gekoppeld aanbod.</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-4 p-4">
        {form.id && form.status === "pending" ? (
          <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">Deze aanvraag wacht op bevestiging.</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => onStatusChange(form.id!, "confirmed")} disabled={disabled || isSaving}>
                Accepteren
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onStatusChange(form.id!, "cancelled")} disabled={disabled || isSaving}>
                Afwijzen
              </Button>
            </div>
          </div>
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
          <Label htmlFor="calendar-title">Titel</Label>
          <Input
            id="calendar-title"
            value={form.title}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="calendar-type">Type</Label>
            <select
              id="calendar-type"
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
            <Label htmlFor="calendar-status">Status</Label>
            <select
              id="calendar-status"
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
          <Label htmlFor="calendar-service">{offeringCopy.singular[0].toUpperCase()}{offeringCopy.singular.slice(1)}</Label>
          <select
            id="calendar-service"
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
            <Label htmlFor="calendar-start">Start</Label>
            <Input
              id="calendar-start"
              type="datetime-local"
              value={form.start_at}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, start_at: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="calendar-end">Einde</Label>
            <Input
              id="calendar-end"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="calendar-name">Klantnaam</Label>
            <Input
              id="calendar-name"
              value={form.customer_name}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, customer_name: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="calendar-phone">Telefoon</Label>
            <Input
              id="calendar-phone"
              value={form.customer_phone}
              disabled={disabled}
              onChange={(event) => onChange({ ...form, customer_phone: event.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calendar-email">E-mail</Label>
          <Input
            id="calendar-email"
            value={form.customer_email}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, customer_email: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="calendar-notes">Interne notities</Label>
          <Textarea
            id="calendar-notes"
            rows={3}
            value={form.internal_notes}
            disabled={disabled}
            onChange={(event) => onChange({ ...form, internal_notes: event.target.value })}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
