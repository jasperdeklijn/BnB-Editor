"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Clipboard, CloudDownload, ExternalLink, KeyRound, RefreshCw, Trash2 } from "lucide-react"

import {
  createCalendarImportSourceAction,
  deleteCalendarImportSourceAction,
  rotateCalendarExportFeedAction,
  setCalendarExportEnabledAction,
  setCalendarImportSourceEnabledAction,
  synchronizeCalendarSourceAction,
} from "@/app/editor/calendar/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import type { CalendarImportSource, CalendarSyncData, CalendarSyncHealth } from "@/lib/calendar/sync"

const HEALTH_COPY: Record<CalendarSyncHealth, { label: string; className: string }> = {
  healthy: { label: "Actueel", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  warning: { label: "Aandacht nodig", className: "border-amber-200 bg-amber-50 text-amber-900" },
  stale: { label: "Verouderd", className: "border-red-200 bg-red-50 text-red-900" },
  never: { label: "Nog niet gesynchroniseerd", className: "border-slate-200 bg-slate-50 text-slate-700" },
  disabled: { label: "Gepauzeerd", className: "border-slate-200 bg-slate-50 text-slate-600" },
}

function formatDate(value: string | null) {
  if (!value) return "Nog nooit"
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value))
}

export function CalendarSyncPanel({
  businessId,
  initialData,
  unavailable,
}: {
  businessId: string
  initialData: CalendarSyncData
  unavailable: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [name, setName] = useState("")
  const [feedUrl, setFeedUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => setData(initialData), [initialData])

  const finish = (next: CalendarSyncData, text: string) => {
    setData(next)
    setMessage({ tone: "success", text })
    router.refresh()
  }

  const rotateExport = () => startTransition(async () => {
    if (data.exportFeed && !window.confirm("De huidige privélink stopt direct met werken. Wilt u de sleutel roteren?")) return
    const result = await rotateCalendarExportFeedAction(businessId)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    finish(result.data, data.exportFeed ? "Privélink vernieuwd. De oude link is ongeldig." : "Privélink aangemaakt.")
  })

  const toggleExport = () => startTransition(async () => {
    if (!data.exportFeed) return
    const enabled = !data.exportFeed.enabled
    const result = await setCalendarExportEnabledAction(businessId, enabled)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    finish(result.data, enabled ? "Kalenderexport hervat." : "Kalenderexport gepauzeerd.")
  })

  const copyExport = async () => {
    if (!data.exportFeed) return
    try {
      await navigator.clipboard.writeText(data.exportFeed.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage({ tone: "error", text: "Kopiëren lukte niet. Selecteer de link handmatig." })
    }
  }

  const addImport = () => startTransition(async () => {
    setMessage(null)
    const result = await createCalendarImportSourceAction(businessId, { name, feedUrl })
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    setData(result.data)
    setName("")
    setFeedUrl("")
    if (result.result.status === "failed") {
      setMessage({ tone: "error", text: `Bron toegevoegd, maar de eerste synchronisatie mislukte: ${result.result.error}` })
    } else {
      setMessage({ tone: "success", text: `${result.result.eventCount ?? 0} bezette momenten geïmporteerd.` })
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

  const removeSource = (source: CalendarImportSource) => startTransition(async () => {
    if (!window.confirm(`Bron “${source.name}” verwijderen? De bijbehorende blokkades worden ook verwijderd.`)) return
    const result = await deleteCalendarImportSourceAction(source.id)
    if (!result.success) return setMessage({ tone: "error", text: result.error })
    finish(result.data, "Kalenderbron en geïmporteerde blokkades verwijderd.")
  })

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ExternalLink className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Externe kalenders</h2>
            <p className="text-xs text-muted-foreground">Deel deze kalender en importeer bezette tijden via iCal.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-4">
        {unavailable ? (
          <StatusMessage tone="error">Voer eerst de Phase 4-kalendermigratie uit.</StatusMessage>
        ) : null}
        {message ? <StatusMessage tone={message.tone}>{message.text}</StatusMessage> : null}

        <div className="grid gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Privé exportlink</h3>
            <p className="text-xs text-muted-foreground">Wie deze link heeft, kan kalenderdatums en titels lezen. Contactgegevens en interne notities worden niet geëxporteerd.</p>
          </div>
          {data.exportFeed ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="calendar-export-url">iCal-abonnementslink</Label>
                <div className="flex gap-2">
                  <Input id="calendar-export-url" value={data.exportFeed.url} readOnly className="min-w-0 text-xs" />
                  <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={copyExport} disabled={isPending} aria-label="Privélink kopiëren">
                    {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={toggleExport} disabled={isPending || unavailable}>
                  {data.exportFeed.enabled ? "Export pauzeren" : "Export hervatten"}
                </Button>
                <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={rotateExport} disabled={isPending || unavailable}>
                  <KeyRound className="h-4 w-4" /> Sleutel roteren
                </Button>
              </div>
              {!data.exportFeed.enabled ? <p className="text-xs font-medium text-amber-700">De link geeft nu een 404 totdat u export hervat.</p> : null}
            </>
          ) : (
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={rotateExport} disabled={isPending || unavailable}>
              <KeyRound className="h-4 w-4" /> Privélink maken
            </Button>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Bezette tijden importeren</h3>
          <p className="mt-1 text-xs text-muted-foreground">Alleen tijd, titel en bezetstatus worden gelezen. Externe items zijn hier alleen-lezen en blokkeren alle boekbare diensten.</p>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="calendar-import-name">Naam</Label>
              <Input id="calendar-import-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bijvoorbeeld Privé agenda" maxLength={100} disabled={isPending || unavailable} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="calendar-import-url">Privé iCal-link</Label>
              <Input id="calendar-import-url" type="url" inputMode="url" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://…/calendar.ics" maxLength={2048} disabled={isPending || unavailable} />
            </div>
            <Button type="button" className="min-h-11 w-full" onClick={addImport} disabled={isPending || unavailable || !name.trim() || !feedUrl.trim()}>
              <CloudDownload className="h-4 w-4" /> Bron toevoegen en testen
            </Button>
          </div>
        </div>

        {data.importSources.length > 0 ? (
          <div className="grid gap-3 border-t border-border pt-4">
            {data.importSources.map((source) => {
              const health = HEALTH_COPY[source.health]
              return (
                <article key={source.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-medium text-foreground">{source.name}</h4>
                      <p className="truncate text-xs text-muted-foreground">{source.urlHost}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${health.className}`}>{health.label}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-muted-foreground">Laatste succes</dt><dd className="font-medium text-foreground">{formatDate(source.lastSyncSucceededAt)}</dd></div>
                    <div><dt className="text-muted-foreground">Blokkades</dt><dd className="font-medium text-foreground">{source.eventCount}</dd></div>
                  </dl>
                  {source.ignoredCount > 0 ? <p className="mt-2 text-xs text-muted-foreground">{source.ignoredCount} transparante, geannuleerde of onvolledige items overgeslagen.</p> : null}
                  {source.lastError ? <p className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">{source.lastError}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => syncSource(source)} disabled={isPending || unavailable || !source.enabled}>
                      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} /> Nu synchroniseren
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => toggleSource(source)} disabled={isPending || unavailable}>
                      {source.enabled ? "Pauzeren" : "Hervatten"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" onClick={() => removeSource(source)} disabled={isPending || unavailable}>
                      <Trash2 className="h-4 w-4" /> Verwijderen
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">Google Calendar- en Outlook-koppelingen via OAuth blijven bewust uitgeschakeld totdat de iCal-import en -export in productie betrouwbaar zijn gebleken.</p>
      </div>
    </section>
  )
}
