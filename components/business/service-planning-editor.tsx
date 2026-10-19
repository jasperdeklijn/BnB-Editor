"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { bookingCatalogSchema, type BookingCatalog } from "@/lib/booking/cart"
import {
  getServicePlanning,
  saveBookingResource,
  saveServicePlanning,
} from "@/lib/booking/planning-actions"
import { toast } from "sonner"
import { useEditorFormNavigation } from "@/components/editor/use-editor-form-navigation"

type Window = { weekday: number; start_time: string; end_time: string }
type Exception = {
  date: string
  windows: Array<{ start_time: string; end_time: string }>
}
type Resource = {
  id: string
  name: string
  capacity: number
  timezone: string
  windows: Window[]
}
const weekdays = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
]
const defaultWindows: Window[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  start_time: "09:00",
  end_time: "17:00",
}))
const defaultCatalog: BookingCatalog = {
  enabled: false,
  combinable: true,
  vat_rate_basis_points: 0,
  variants: [
    { id: "base", name: "Standaard", duration_minutes: 60, price_minor: 0 },
  ],
  extras: [],
}

function WeekSchedule({
  value,
  onChange,
  label,
}: {
  value: Window[]
  onChange: (next: Window[]) => void
  label: string
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      {weekdays.map((day, index) => {
        const rows = value
          .map((row, rowIndex) => ({ ...row, rowIndex }))
          .filter((row) => row.weekday === index + 1)
        return (
          <div key={day} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">
                {day}
                {!rows.length ? " · Gesloten" : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange([
                    ...value,
                    {
                      weekday: index + 1,
                      start_time: "09:00",
                      end_time: "17:00",
                    },
                  ])
                }
              >
                Tijdvak toevoegen
              </Button>
            </div>
            {rows.map((row) => (
              <div key={row.rowIndex} className="mt-2 flex items-end gap-2">
                <label className="min-w-0 flex-1 text-xs">
                  Van
                  <Input
                    type="time"
                    aria-label={`${label} ${day} van`}
                    value={row.start_time}
                    onChange={(event) =>
                      onChange(
                        value.map((item, i) =>
                          i === row.rowIndex
                            ? { ...item, start_time: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="min-w-0 flex-1 text-xs">
                  Tot
                  <Input
                    type="time"
                    aria-label={`${label} ${day} tot`}
                    value={row.end_time}
                    onChange={(event) =>
                      onChange(
                        value.map((item, i) =>
                          i === row.rowIndex
                            ? { ...item, end_time: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${label} ${day} tijdvak verwijderen`}
                  onClick={() =>
                    onChange(value.filter((_, i) => i !== row.rowIndex))
                  }
                >
                  ×
                </Button>
              </div>
            ))}
            {index === 0 && rows.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="link"
                onClick={() =>
                  onChange([
                    ...value.filter((row) => row.weekday > 5),
                    ...[1, 2, 3, 4, 5].flatMap((weekday) =>
                      rows.map(({ start_time, end_time }) => ({
                        weekday,
                        start_time,
                        end_time,
                      })),
                    ),
                  ])
                }
              >
                Kopieer maandag naar werkdagen
              </Button>
            ) : null}
          </div>
        )
      })}
    </fieldset>
  )
}

export function ServicePlanningEditor({
  serviceId,
  mode,
  onDirtyChange,
}: {
  serviceId: string
  mode: "options" | "availability"
  onDirtyChange: (dirty: boolean) => void
}) {
  const router = useRouter()
  const [revision, setRevision] = useState("")
  const [loading, setLoading] = useState(true),
    [allowed, setAllowed] = useState(true),
    [error, setError] = useState("")
  const [catalog, setCatalog] = useState<BookingCatalog>(defaultCatalog)
  const [windows, setWindows] = useState<Window[]>([]),
    [useBusiness, setUseBusiness] = useState(true),
    [exceptions, setExceptions] = useState<Exception[]>([])
  const [resources, setResources] = useState<Resource[]>([]),
    [resourceId, setResourceId] = useState<string | null>(null),
    [resourceDraft, setResourceDraft] = useState<Resource | null>(null)
  const [timezone, setTimezone] = useState("Europe/Amsterdam"),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [reload, setReload] = useState(0)
  useEditorFormNavigation(dirty, busy)
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getServicePlanning(serviceId)
      .then((data) => {
        if (cancelled) return
        setAllowed(data.allowed)
        if (data.allowed) {
          setRevision(data.revision)
          setCatalog(
            bookingCatalogSchema.safeParse(data.catalog).success
              ? bookingCatalogSchema.parse(data.catalog)
              : defaultCatalog,
          )
          setWindows(
            data.windows
              .filter((row) => row.is_active)
              .map((row) => ({
                weekday: row.weekday,
                start_time: row.start_time.slice(0, 5),
                end_time: row.end_time.slice(0, 5),
              })),
          )
          setUseBusiness(data.windows.length === 0)
          setExceptions(data.exceptions as Exception[])
          setResources(data.resources as Resource[])
          setResourceId(data.resourceId)
          setTimezone(data.timezone)
          setDirty(false)
        }
        setError("")
      })
      .catch((error) => {
        if (!cancelled)
          setError(
            error instanceof Error ? error.message : "Laden is niet gelukt.",
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [serviceId, reload])
  const updateCatalog = (next: BookingCatalog) => {
    setCatalog(next)
    setDirty(true)
  }
  const save = async () => {
    setBusy(true)
    setError("")
    try {
      await saveServicePlanning(serviceId, {
        expectedRevision: revision,
        catalog,
        windows,
        useBusinessSchedule: useBusiness,
        exceptions,
        resourceId,
        timezone,
      })
      setDirty(false)
      setReload((value) => value + 1)
      toast.success(
        "Dienstenplanning opgeslagen. Publiceer opnieuw om gewijzigde opties te tonen.",
      )
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Opslaan is niet gelukt.",
      )
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <p role="status" className="p-5 text-sm text-muted-foreground">
        Dienstenplanning laden…
      </p>
    )
  if (!allowed)
    return (
      <div className="space-y-3 p-5">
        <p>
          Opties en beschikbaarheidsplanning zijn onderdeel van de
          boekingsadd-on.
        </p>
        <Button asChild>
          <Link href="/editor/account/billing">Boekingsadd-on bekijken</Link>
        </Button>
      </div>
    )
  return (
    <div className="space-y-5 p-5">
      <p className="text-xs font-semibold text-primary">
        Onderdeel van Booking & Facturatie
      </p>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          {error}
          <Button
            type="button"
            variant="link"
            onClick={() => setReload((value) => value + 1)}
          >
            Opnieuw laden
          </Button>
        </div>
      ) : null}
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {mode === "options" ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={catalog.enabled}
                onChange={(event) =>
                  updateCatalog({ ...catalog, enabled: event.target.checked })
                }
              />
              Deze dienst via ‘Jouw boeking’ aanbieden
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={catalog.combinable}
                onChange={(event) =>
                  updateCatalog({
                    ...catalog,
                    combinable: event.target.checked,
                  })
                }
              />
              Mag samen met andere diensten geboekt worden
            </label>
            <p className="text-xs text-muted-foreground">
              Voer prijzen exclusief btw in. De klant ziet het totaal inclusief
              het ingestelde btw-tarief. De algemene vrije prijstekst wordt niet
              automatisch overgenomen.
            </p>
            <label className="block text-xs">
              Btw-percentage
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={catalog.vat_rate_basis_points / 100}
                onChange={(event) =>
                  updateCatalog({
                    ...catalog,
                    vat_rate_basis_points: Math.round(
                      Number(event.target.value) * 100,
                    ),
                  })
                }
              />
            </label>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Varianten · de klant kiest er één
              </h3>
              {catalog.variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className="space-y-2 rounded-lg border p-3"
                >
                  <label className="block text-xs">
                    Naam
                    <Input
                      value={variant.name}
                      onChange={(event) =>
                        updateCatalog({
                          ...catalog,
                          variants: catalog.variants.map((row, i) =>
                            i === index
                              ? { ...row, name: event.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs">
                      Duur in minuten
                      <Input
                        type="number"
                        min={5}
                        max={1440}
                        value={variant.duration_minutes}
                        onChange={(event) =>
                          updateCatalog({
                            ...catalog,
                            variants: catalog.variants.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    duration_minutes: Number(
                                      event.target.value,
                                    ),
                                  }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      Prijs in euro excl. btw
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={variant.price_minor / 100}
                        onChange={(event) =>
                          updateCatalog({
                            ...catalog,
                            variants: catalog.variants.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    price_minor: Math.round(
                                      Number(event.target.value) * 100,
                                    ),
                                  }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={catalog.variants.length === 1}
                    onClick={() =>
                      updateCatalog({
                        ...catalog,
                        variants: catalog.variants.filter(
                          (_, i) => i !== index,
                        ),
                        extras: catalog.extras.map((extra) => ({
                          ...extra,
                          variant_ids: extra.variant_ids.filter(
                            (id) => id !== variant.id,
                          ),
                        })),
                      })
                    }
                  >
                    Variant verwijderen
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={catalog.variants.length >= 20}
                onClick={() =>
                  updateCatalog({
                    ...catalog,
                    variants: [
                      ...catalog.variants,
                      {
                        id: crypto.randomUUID(),
                        name: "Nieuwe variant",
                        duration_minutes: 60,
                        price_minor: 0,
                      },
                    ],
                  })
                }
              >
                Variant toevoegen
              </Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Extra's · optioneel bij te boeken
              </h3>
              {catalog.extras.map((extra, index) => {
                const change = (patch: Partial<typeof extra>) =>
                  updateCatalog({
                    ...catalog,
                    extras: catalog.extras.map((row, i) =>
                      i === index ? { ...row, ...patch } : row,
                    ),
                  })
                return (
                  <div
                    key={extra.id}
                    className="space-y-3 rounded-lg border p-3"
                  >
                    <label className="block text-xs">
                      Naam
                      <Input
                        value={extra.name}
                        onChange={(event) =>
                          change({ name: event.target.value })
                        }
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs">
                        Extra minuten
                        <Input
                          type="number"
                          min={0}
                          max={480}
                          value={extra.duration_minutes}
                          onChange={(event) =>
                            change({
                              duration_minutes: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-xs">
                        Toeslag in euro excl. btw
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={extra.price_minor / 100}
                          onChange={(event) =>
                            change({
                              price_minor: Math.round(
                                Number(event.target.value) * 100,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                    <fieldset className="space-y-1">
                      <legend className="text-xs">
                        Beschikbaar bij varianten · leeg betekent alle
                      </legend>
                      {catalog.variants.map((variant) => (
                        <label
                          key={variant.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={extra.variant_ids.includes(variant.id)}
                            onChange={(event) =>
                              change({
                                variant_ids: event.target.checked
                                  ? [...extra.variant_ids, variant.id]
                                  : extra.variant_ids.filter(
                                      (id) => id !== variant.id,
                                    ),
                              })
                            }
                          />
                          {variant.name}
                        </label>
                      ))}
                    </fieldset>
                    <label className="block text-xs">
                      Keuzegroep (optioneel)
                      <Input
                        placeholder="Bijvoorbeeld: massagevorm"
                        value={extra.exclusive_group}
                        onChange={(event) =>
                          change({ exclusive_group: event.target.value })
                        }
                      />
                      <span className="text-muted-foreground">
                        Extra's met dezelfde keuzegroep sluiten elkaar uit.
                      </span>
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateCatalog({
                          ...catalog,
                          extras: catalog.extras.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Extra verwijderen
                    </Button>
                  </div>
                )
              })}
              <Button
                type="button"
                variant="outline"
                disabled={catalog.extras.length >= 40}
                onClick={() =>
                  updateCatalog({
                    ...catalog,
                    extras: [
                      ...catalog.extras,
                      {
                        id: crypto.randomUUID(),
                        name: "Nieuwe extra",
                        duration_minutes: 0,
                        price_minor: 0,
                        variant_ids: [],
                        exclusive_group: "",
                      },
                    ],
                  })
                }
              >
                Extra toevoegen
              </Button>
            </div>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useBusiness}
                onChange={(event) => {
                  setUseBusiness(event.target.checked)
                  setDirty(true)
                }}
              />
              Algemeen bedrijfsrooster gebruiken
            </label>
            {!useBusiness ? (
              <WeekSchedule
                label="Beschikbaarheid van deze dienst"
                value={windows}
                onChange={(value) => {
                  setWindows(value)
                  setDirty(true)
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Stel het algemene rooster in de kalender in. Een eigen rooster
                vervangt de bedrijfsuren voor deze dienst.
              </p>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Uitzonderingen per datum
              </h3>
              {exceptions.map((exception, index) => (
                <div key={index} className="space-y-2 rounded-lg border p-3">
                  <label className="block text-xs">
                    Datum
                    <Input
                      type="date"
                      value={exception.date}
                      onChange={(event) => {
                        setExceptions(
                          exceptions.map((row, i) =>
                            i === index
                              ? { ...row, date: event.target.value }
                              : row,
                          ),
                        )
                        setDirty(true)
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={exception.windows.length === 0}
                      onChange={(event) => {
                        setExceptions(
                          exceptions.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  windows: event.target.checked
                                    ? []
                                    : [
                                        {
                                          start_time: "09:00",
                                          end_time: "17:00",
                                        },
                                      ],
                                }
                              : row,
                          ),
                        )
                        setDirty(true)
                      }}
                    />
                    Hele dag gesloten
                  </label>
                  {exception.windows.map((window, windowIndex) => (
                    <div key={windowIndex} className="flex gap-2">
                      {(["start_time", "end_time"] as const).map((key) => (
                        <label key={key} className="min-w-0 flex-1 text-xs">
                          {key === "start_time" ? "Van" : "Tot"}
                          <Input
                            type="time"
                            value={window[key]}
                            onChange={(event) => {
                              setExceptions(
                                exceptions.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        windows: row.windows.map((w, j) =>
                                          j === windowIndex
                                            ? {
                                                ...w,
                                                [key]: event.target.value,
                                              }
                                            : w,
                                        ),
                                      }
                                    : row,
                                ),
                              )
                              setDirty(true)
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                  {exception.windows.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      onClick={() => {
                        setExceptions(
                          exceptions.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  windows: [
                                    ...row.windows,
                                    { start_time: "09:00", end_time: "17:00" },
                                  ],
                                }
                              : row,
                          ),
                        )
                        setDirty(true)
                      }}
                    >
                      Extra tijdvak
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setExceptions(exceptions.filter((_, i) => i !== index))
                      setDirty(true)
                    }}
                  >
                    Uitzondering verwijderen
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExceptions([...exceptions, { date: "", windows: [] }])
                  setDirty(true)
                }}
              >
                Uitzondering toevoegen
              </Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Gedeelde agenda</h3>
              <p className="text-xs text-muted-foreground">
                Koppel diensten aan dezelfde agenda om dubbele boekingen van een
                medewerker of ruimte te voorkomen.
              </p>
              <label className="block text-xs">
                Wie of wat voert de dienst uit?
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={resourceId ?? ""}
                  onChange={(event) => {
                    setResourceId(event.target.value || null)
                    setDirty(true)
                  }}
                >
                  <option value="">Eigen capaciteit van deze dienst</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} · capaciteit {resource.capacity}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setResourceDraft({
                      id: "",
                      name: "Mijn agenda",
                      capacity: 1,
                      timezone,
                      windows: defaultWindows,
                    })
                  }
                >
                  Gedeelde agenda toevoegen
                </Button>
                {resourceId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setResourceDraft(
                        resources.find(
                          (resource) => resource.id === resourceId,
                        ) ?? null,
                      )
                    }
                  >
                    Agenda bewerken
                  </Button>
                ) : null}
              </div>
              {resourceDraft ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <label className="block text-xs">
                    Agendanaam
                    <Input
                      value={resourceDraft.name}
                      onChange={(event) =>
                        setResourceDraft({
                          ...resourceDraft,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    Capaciteit
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={resourceDraft.capacity}
                      onChange={(event) =>
                        setResourceDraft({
                          ...resourceDraft,
                          capacity: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <WeekSchedule
                    label="Werkuren van deze agenda"
                    value={resourceDraft.windows}
                    onChange={(windows) =>
                      setResourceDraft({ ...resourceDraft, windows })
                    }
                  />
                  <Button
                    type="button"
                    onClick={async () => {
                      setBusy(true)
                      try {
                        const saved = await saveBookingResource(serviceId, {
                          ...resourceDraft,
                          id: resourceDraft.id || undefined,
                        })
                        setResources([
                          ...resources.filter((row) => row.id !== saved.id),
                          saved as Resource,
                        ])
                        setResourceId(saved.id)
                        setResourceDraft(null)
                        setDirty(true)
                        toast.success("Gedeelde agenda opgeslagen.")
                      } catch (error) {
                        setError(
                          error instanceof Error
                            ? error.message
                            : "Opslaan mislukt.",
                        )
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Agenda opslaan
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
        <Button type="button" disabled={!dirty || busy} onClick={save}>
          {busy ? "Opslaan…" : "Wijzigingen opslaan"}
        </Button>
        {dirty ? (
          <p role="status" className="text-xs text-muted-foreground">
            Er zijn nog niet opgeslagen wijzigingen.
          </p>
        ) : null}
      </fieldset>
    </div>
  )
}
