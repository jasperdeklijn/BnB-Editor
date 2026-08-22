"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Clipboard, CloudDownload, ExternalLink, KeyRound, RefreshCw, Trash2 } from "lucide-react"

import {
  createCalendarImportSourceAction,
  deleteCalendarImportSourceAction,
  rotateCalendarExportFeedAction,
  setCalendarExportEnabledAction,
  setCalendarImportSourceEnabledAction,
  synchronizeCalendarSourceAction,
  updateCalendarImportSourceAction,
} from "@/app/editor/calendar/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import type {
  CalendarExportFeed,
  CalendarExportTarget,
  CalendarImportSource,
  CalendarProvider,
  CalendarSyncData,
  CalendarSyncHealth,
} from "@/lib/calendar/sync"

const HEALTH_COPY: Record<CalendarSyncHealth, { label: string; className: string }> = {
  healthy: { label: "Gekoppeld", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  warning: { label: "Fout", className: "border-amber-200 bg-amber-50 text-amber-900" },
  stale: { label: "Verouderd", className: "border-red-200 bg-red-50 text-red-900" },
  never: { label: "Koppeling controleren", className: "border-slate-200 bg-slate-50 text-slate-700" },
  disabled: { label: "Gepauzeerd", className: "border-slate-200 bg-slate-50 text-slate-600" },
}

const PROVIDER_COPY: Record<CalendarProvider, { label: string; defaultName: string }> = {
  booking_com: { label: "Booking.com", defaultName: "Booking.com" },
  google_calendar: { label: "Google Agenda", defaultName: "Google Agenda" },
  other: { label: "Andere iCal-agenda", defaultName: "Externe agenda" },
}

function formatDate(value: string | null) {
  if (!value) return "Nog nooit"
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value))
}

function ExportFeedControl({
  label,
  description,
  feed,
  revealedUrl,
  disabled,
  onRotate,
  onToggle,
}: {
  label: string
  description: string
  feed: CalendarExportFeed | null
  revealedUrl: string | null
  disabled: boolean
  onRotate: () => void
  onToggle: () => void
}) {
  const [copied, setCopied] = useState(false)
  const url = revealedUrl || feed?.url || null

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // The readonly field remains available for manual selection.
    }
  }

  return (
    <div className="grid gap-2 rounded-md border border-border bg-background p-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {feed ? (
        <>
          {url ? (
            <div className="flex gap-2">
              <Input value={url} readOnly className="min-w-0 text-xs" aria-label={`${label} kalenderlink`} />
              <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={copy} disabled={disabled} aria-label="Kalenderlink kopiëren">
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <p className="rounded bg-muted p-2 text-xs text-muted-foreground">
              Beveiligde link ••••{feed.tokenPrefix || "verborgen"}. De volledige link wordt alleen na aanmaken of roteren getoond.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onToggle} disabled={disabled}>
              {feed.enabled ? "Export pauzeren" : "Export hervatten"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onRotate} disabled={disabled}>
              <KeyRound className="h-4 w-4" /> Nieuwe link maken
            </Button>
          </div>
          {!feed.enabled ? <p className="text-xs font-medium text-amber-700">Deze link geeft 404 totdat export wordt hervat.</p> : null}
        </>
      ) : (
        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onRotate} disabled={disabled}>
          <KeyRound className="h-4 w-4" /> Kalenderlink maken
        </Button>
      )}
    </div>
  )
}

export function CalendarSyncPanel({
  businessId,
  accommodations,
  initialData,
  unavailable,
}: {
  businessId: string
  accommodations: Array<{ id: string; title: string }>
  initialData: CalendarSyncData
  unavailable: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [serviceId, setServiceId] = useState(accommodations[0]?.id || "")
  const [provider, setProvider] = useState<CalendarProvider>("booking_com")
  const [name, setName] = useState(PROVIDER_COPY.booking_com.defaultName)
  const [feedUrl, setFeedUrl] = useState("")
  const [revealedUrls, setRevealedUrls] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => setData(initialData), [initialData])
  useEffect(() => {
    if (!accommodations.some((item) => item.id === serviceId)) setServiceId(accommodations[0]?.id || "")
  }, [accommodations, serviceId])

  const selectedAccommodation = accommodations.find((item) => item.id === serviceId) ?? null
  const serviceSources = useMemo(
    () => data.importSources.filter((source) => source.serviceId === serviceId),
    [data.importSources, serviceId],
  )
  const businessSources = useMemo(
    () => data.importSources.filter((source) => source.serviceId === null),
    [data.importSources],
  )

  const feedFor = (targetProvider: CalendarExportTarget) => data.exportFeeds.find(
    (feed) => feed.serviceId === serviceId && feed.targetProvider === targetProvider,
  ) ?? null

  const finish = (next: CalendarSyncData, text: string) => {
    setData(next)
    setMessage({ tone: "success", text })
    router.refresh()
  }

  const rotateExport = (targetProvider: CalendarExportTarget, feed: CalendarExportFeed | null) => startTransition(async () => {
    if (feed && !window.confirm("De huidige kalenderlink stopt direct met werken. Wilt u een nieuwe link maken?")) return
    const result = await rotateCalendarExportFeedAction(businessId, {
      serviceId: targetProvider === "overview" ? null : serviceId,
      targetProvider,
    })
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    setRevealedUrls((current) => ({ ...current, [result.feedId]: result.revealedUrl }))
    finish(result.data, feed ? "Nieuwe link gemaakt. De oude link is ongeldig." : "Kalenderlink aangemaakt. Kopieer deze nu en bewaar hem bij de aanbieder.")
  })

  const toggleExport = (feed: CalendarExportFeed) => startTransition(async () => {
    const enabled = !feed.enabled
    const result = await setCalendarExportEnabledAction(feed.id, enabled)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    finish(result.data, enabled ? "Kalenderexport hervat." : "Kalenderexport gepauzeerd.")
  })

  const addImport = () => startTransition(async () => {
    setMessage(null)
    const result = await createCalendarImportSourceAction(businessId, { serviceId, provider, name, feedUrl })
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    setData(result.data)
    setFeedUrl("")
    if (result.result.status === "failed") {
      setMessage({ tone: "error", text: `Bron veilig opgeslagen, maar de eerste synchronisatie mislukte: ${result.result.error}` })
    } else {
      setMessage({ tone: "success", text: `${result.result.eventCount ?? 0} bezette momenten geïmporteerd voor ${selectedAccommodation?.title || "de accommodatie"}.` })
    }
    router.refresh()
  })

  const toggleSource = (source: CalendarImportSource) => startTransition(async () => {
    const result = await setCalendarImportSourceEnabledAction(source.id, !source.enabled)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    finish(result.data, source.enabled ? "Kalenderimport gepauzeerd." : "Kalenderimport hervat.")
  })

  const syncSource = (source: CalendarImportSource) => startTransition(async () => {
    const result = await synchronizeCalendarSourceAction(source.id)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    setData(result.data)
    if (result.result.status === "failed") {
      setMessage({ tone: "error", text: result.result.error || "Synchronisatie mislukt." })
    } else if (result.result.status === "skipped") {
      setMessage({ tone: "error", text: "Deze bron wordt al gesynchroniseerd of is gepauzeerd." })
    } else {
      setMessage({ tone: "success", text: result.result.status === "unchanged" ? "Kalender is al actueel." : `${result.result.eventCount ?? 0} bezette momenten bijgewerkt.` })
    }
    router.refresh()
  })

  const changeSource = (source: CalendarImportSource) => {
    const nextUrl = window.prompt(`Plak de nieuwe geheime iCal-link voor ${source.name}. De huidige link wordt nooit in de browser teruggetoond.`)
    if (!nextUrl?.trim()) return
    startTransition(async () => {
      const result = await updateCalendarImportSourceAction(source.id, { name: source.name, feedUrl: nextUrl })
      if (!result.success) return setMessage({ tone: "error", text: result.error })
      setData(result.data)
      setMessage(result.result.status === "failed"
        ? { tone: "error", text: `Link gewijzigd, maar testen mislukte: ${result.result.error}` }
        : { tone: "success", text: "Kalenderlink gewijzigd en getest." })
      router.refresh()
    })
  }

  const removeSource = (source: CalendarImportSource) => startTransition(async () => {
    if (!window.confirm(`Bron “${source.name}” verwijderen? De bijbehorende blokkades worden ook verwijderd.`)) return
    const result = await deleteCalendarImportSourceAction(source.id)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    finish(result.data, "Kalenderbron en geïmporteerde blokkades verwijderd.")
  })

  const bookingFeed = feedFor("booking_com")
  const googleFeed = feedFor("google_calendar")
  const disabled = unavailable || isPending

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ExternalLink className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Booking.com-agenda koppelen</h2>
            <p className="text-xs text-muted-foreground">ICS/iCalendar werkt ook op Android en Windows; een Apple-apparaat is niet nodig.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-4">
        {unavailable ? <StatusMessage tone="error">Voer eerst de servicegerichte iCal-migratie uit.</StatusMessage> : null}
        {message ? <StatusMessage tone={message.tone}>{message.text}</StatusMessage> : null}
        <StatusMessage tone="warning">
          iCal is niet realtime. Booking.com en Google bepalen zelf wanneer zij feeds ophalen; dubbele boekingen kunnen daardoor niet volledig worden uitgesloten.
        </StatusMessage>

        {accommodations.length === 0 ? (
          <StatusMessage tone="error">Maak bij Diensten eerst een accommodatie met boekingstype Verblijf aan.</StatusMessage>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="calendar-accommodation">Accommodatie</Label>
              <select
                id="calendar-accommodation"
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                disabled={disabled}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {accommodations.map((item) => <option key={item.id} value={item.id}>{item.title || "Naamloze accommodatie"}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Iedere accommodatie heeft eigen import- en exportlinks. Meerdere identieke units binnen één Booking.com-kamertype worden niet afzonderlijk beheerd.</p>
            </div>

            <div className="grid gap-3">
              <ExportFeedControl
                label="FlexPagina-link voor Booking.com"
                description="Publiceert bezette verblijfsdatums zonder persoonsgegevens en sluit Booking.com-imports uit."
                feed={bookingFeed}
                revealedUrl={bookingFeed ? revealedUrls[bookingFeed.id] || null : null}
                disabled={disabled || !serviceId}
                onRotate={() => rotateExport("booking_com", bookingFeed)}
                onToggle={() => bookingFeed && toggleExport(bookingFeed)}
              />
              <ExportFeedControl
                label="Alleen-lezen link voor Google Agenda of Outlook"
                description="Toont bezette datums en sluit Google-imports uit om synchronisatielussen te voorkomen."
                feed={googleFeed}
                revealedUrl={googleFeed ? revealedUrls[googleFeed.id] || null : null}
                disabled={disabled || !serviceId}
                onRotate={() => rotateExport("google_calendar", googleFeed)}
                onToggle={() => googleFeed && toggleExport(googleFeed)}
              />
            </div>

            <details className="rounded-md border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold">Stappen voor Booking.com</summary>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Kies hierboven exact dezelfde accommodatie als in Booking.com.</li>
                <li>Maak de FlexPagina-link en importeer deze in de kalendersynchronisatie van Booking.com Extranet.</li>
                <li>Exporteer daarna in Booking.com de kalender van die accommodatie.</li>
                <li>Kies hieronder Booking.com, plak die geheime URL en test de koppeling.</li>
              </ol>
            </details>

            <details className="rounded-md border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold">Stappen voor Google Agenda</summary>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>Gebruik één aparte Google-agenda per accommodatie. Open Google Agenda op een computer en kopieer bij Instellingen → Agenda integreren het <strong>Geheim adres in iCal-indeling</strong>.</p>
                <p>Behandel dit adres als een wachtwoord. Een abonnement op de FlexPagina-link is alleen-lezen en kan vertraagd verversen.</p>
              </div>
            </details>

            <div className="grid gap-3 border-t border-border pt-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Bezette tijden importeren</h3>
                <p className="text-xs text-muted-foreground">De geheime URL wordt versleuteld opgeslagen. Externe titels en gastgegevens worden niet overgenomen.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calendar-provider">Aanbieder</Label>
                <select
                  id="calendar-provider"
                  value={provider}
                  onChange={(event) => {
                    const next = event.target.value as CalendarProvider
                    setProvider(next)
                    setName(PROVIDER_COPY[next].defaultName)
                  }}
                  disabled={disabled}
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(PROVIDER_COPY).map(([value, copy]) => <option key={value} value={value}>{copy.label}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calendar-import-name">Naam</Label>
                <Input id="calendar-import-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calendar-import-url">Geheime iCal-link</Label>
                <Input id="calendar-import-url" type="url" inputMode="url" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://…/calendar.ics" maxLength={2048} disabled={disabled} />
              </div>
              <Button type="button" className="min-h-11 w-full" onClick={addImport} disabled={disabled || !serviceId || !name.trim() || !feedUrl.trim()}>
                <CloudDownload className="h-4 w-4" /> Bron toevoegen en testen
              </Button>
            </div>

            {serviceSources.length > 0 ? (
              <div className="grid gap-3 border-t border-border pt-4">
                {serviceSources.map((source) => {
                  const health = HEALTH_COPY[source.health]
                  return (
                    <article key={source.id} className="rounded-md border border-border bg-background p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-medium text-foreground">{PROVIDER_COPY[source.provider].label}: {source.name}</h4>
                          <p className="truncate text-xs text-muted-foreground">{source.urlHost}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${health.className}`}>{health.label}</span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div><dt className="text-muted-foreground">Laatste succes</dt><dd className="font-medium text-foreground">{formatDate(source.lastSyncSucceededAt)}</dd></div>
                        <div><dt className="text-muted-foreground">Blokkades</dt><dd className="font-medium text-foreground">{source.eventCount}</dd></div>
                      </dl>
                      {source.ignoredCount > 0 ? <p className="mt-2 text-xs text-muted-foreground">{source.ignoredCount} geannuleerde, transparante of ongeldige items overgeslagen.</p> : null}
                      {source.lastError ? <p className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">{source.lastError}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => syncSource(source)} disabled={disabled || !source.enabled}>
                          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} /> Nu synchroniseren
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => toggleSource(source)} disabled={disabled}>
                          {source.enabled ? "Pauzeren" : "Hervatten"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => changeSource(source)} disabled={disabled}>
                          Koppeling wijzigen
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" onClick={() => removeSource(source)} disabled={disabled}>
                          <Trash2 className="h-4 w-4" /> Verwijderen
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : <p className="text-xs text-muted-foreground">Voor deze accommodatie is nog geen externe agenda gekoppeld.</p>}
          </>
        )}

        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Algemene bedrijfsagenda en bestaande bronnen</summary>
          <div className="mt-3 grid gap-3">
            <ExportFeedControl
              label="Algemene overzichtsfeed"
              description="Bestaande bedrijfsbrede feed voor een alleen-lezen totaaloverzicht; niet gebruiken voor afzonderlijke Booking.com-accommodaties."
              feed={data.overviewFeed}
              revealedUrl={data.overviewFeed ? revealedUrls[data.overviewFeed.id] || null : null}
              disabled={disabled}
              onRotate={() => rotateExport("overview", data.overviewFeed)}
              onToggle={() => data.overviewFeed && toggleExport(data.overviewFeed)}
            />
            {businessSources.map((source) => (
              <div key={source.id} className="rounded border border-border p-2 text-xs text-muted-foreground">
                <p>Bestaande bedrijfsbrede import: {source.name} ({source.urlHost}). Deze blokkeert alle diensten; verwijder hem en voeg hem per accommodatie opnieuw toe als dat niet de bedoeling is.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => syncSource(source)} disabled={disabled || !source.enabled}>Nu synchroniseren</Button>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => toggleSource(source)} disabled={disabled}>{source.enabled ? "Pauzeren" : "Hervatten"}</Button>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => changeSource(source)} disabled={disabled}>Koppeling wijzigen</Button>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" onClick={() => removeSource(source)} disabled={disabled}>Verwijderen</Button>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  )
}
