"use client"

import { MediaImage } from "@/components/images/media-image"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { addLocalDays, localDateForInstant } from "@/lib/booking/availability"
import { createDefaultServiceBookingSettings } from "@/lib/booking/types"
import {
  bookingCatalogSchema,
  getCartAvailability,
  resolveCartLines,
  type CartPlan,
  type CartSelection,
  type CartService,
} from "@/lib/booking/cart"
import { getCartPresentation } from "@/lib/booking/cart-settings"
import { formatMinorUnits } from "@/lib/booking/pricing"

interface Hold {
  holdId: string
  token: string
  expiresAt: string
  plan: CartPlan
}
async function requestJson(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const result = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      result?.error || "De aanvraag is niet gelukt. Probeer opnieuw.",
    )
  return result
}

export function BookingCart({
  data,
  services,
  websiteId,
  sectionId,
  isPreview,
  locale = "nl-NL",
}: {
  data: Record<string, unknown>
  services: CartService[]
  websiteId?: string | null
  sectionId?: string
  isPreview: boolean
  locale?: string
}) {
  const presentation = getCartPresentation(data)
  const available = services.flatMap((service) => {
    const result = bookingCatalogSchema.safeParse(service.booking_catalog)
    return result.success && result.data.enabled
      ? [{ ...service, booking_catalog: result.data }]
      : []
  })
  const [selection, setSelection] = useState<CartSelection>([]),
    [step, setStep] = useState(1)
  const [date, setDate] = useState(() =>
      localDateForInstant(new Date(), "Europe/Amsterdam"),
    ),
    [plans, setPlans] = useState<CartPlan[]>([]),
    [searched, setSearched] = useState(false)
  const [hold, setHold] = useState<Hold | null>(null),
    [confirmationMode, setConfirmationMode] = useState<"request" | "instant">(
      "request",
    )
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState<"pending" | "confirmed" | null>(null)
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    company: "",
  })
  const holdRef = useRef<Hold | null>(null),
    generation = useRef(0)
  const release = (previous: Hold | null) => {
    if (previous && !isPreview)
      void requestJson(
        "/api/booking/cart/holds",
        { holdId: previous.holdId, token: previous.token },
        "DELETE",
      ).catch(() => {})
  }
  useEffect(
    () => () => {
      generation.current += 1
      if (holdRef.current && !isPreview) {
        void fetch("/api/booking/cart/holds", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdId: holdRef.current.holdId,
            token: holdRef.current.token,
          }),
          keepalive: true,
        }).catch(() => {})
      }
    },
    [isPreview],
  )
  let lines: ReturnType<typeof resolveCartLines> = [],
    selectionError = ""
  if (selection.length) {
    try {
      lines = resolveCartLines(selection, available)
    } catch (error) {
      selectionError =
        error instanceof Error ? error.message : "Kies geldige opties."
    }
  }
  const total = lines.reduce((sum, line) => sum + line.price_minor, 0),
    duration = lines.reduce((sum, line) => sum + line.duration_minutes, 0)
  const clearTime = () => {
    generation.current += 1
    release(holdRef.current)
    holdRef.current = null
    setHold(null)
    setPlans([])
    setSearched(false)
    setError("")
  }
  const changeSelection = (next: CartSelection) => {
    clearTime()
    setSelection(next)
    setStep(1)
  }
  const updateItem = (index: number, patch: Partial<CartSelection[number]>) =>
    changeSelection(
      selection.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  const findTimes = async () => {
    setBusy(true)
    setError("")
    const current = ++generation.current
    try {
      if (isPreview) {
        const settings = lines.map((line) => ({
          ...createDefaultServiceBookingSettings(line.service_id, "preview"),
          booking_enabled: true,
          minimum_notice_minutes: 0,
          booking_horizon_days: 730,
        }))
        const result = getCartAvailability({
          lines,
          settings,
          windows: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
            service_id: null,
            weekday,
            start_time: "09:00",
            end_time: "18:00",
            timezone: "Europe/Amsterdam",
            is_active: true,
          })),
          entries: [],
          resources: [],
          resourceWindows: [],
          exceptions: [],
          date_from: date,
          date_to: date,
        })
        setPlans(result)
        setConfirmationMode("request")
        setSearched(true)
      } else {
        const result = await requestJson("/api/booking/cart/availability", {
          websiteId,
          sectionId,
          locale,
          selection,
          dateFrom: date,
          dateTo: date,
        })
        if (current === generation.current) {
          setPlans(result.plans)
          setConfirmationMode(result.confirmationMode)
          setSearched(true)
        }
      }
    } catch (error) {
      if (current === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : "Beschikbaarheid laden is niet gelukt.",
        )
    } finally {
      if (current === generation.current) setBusy(false)
    }
  }
  const chooseTime = async (plan: CartPlan) => {
    setBusy(true)
    setError("")
    const current = ++generation.current
    try {
      const result: Hold = isPreview
        ? {
            holdId: "preview",
            token: "preview",
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            plan,
          }
        : await requestJson("/api/booking/cart/holds", {
            websiteId,
            sectionId,
            locale,
            selection,
            startAt: plan.start_at,
          })
      if (current !== generation.current) {
        release(result)
        return
      }
      release(holdRef.current)
      holdRef.current = result
      setHold(result)
      setConfirmationMode(result.plan.confirmation_mode)
      setStep(3)
    } catch (error) {
      if (current === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : "Dit moment is niet beschikbaar.",
        )
    } finally {
      if (current === generation.current) setBusy(false)
    }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!hold) return
    if (new Date(hold.expiresAt).getTime() <= Date.now()) {
      clearTime()
      setStep(2)
      setError("Je tijdelijke reservering is verlopen. Kies opnieuw een tijd.")
      return
    }
    setBusy(true)
    setError("")
    try {
      if (isPreview) {
        setSuccess("pending")
        holdRef.current = null
        return
      }
      const result = await requestJson("/api/booking/cart/confirm", {
        holdId: hold.holdId,
        token: hold.token,
        ...customer,
        locale,
      })
      holdRef.current = null
      setSuccess(result.status === "confirmed" ? "confirmed" : "pending")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "De boeking is niet gelukt.",
      )
    } finally {
      setBusy(false)
    }
  }
  const formatTime = (value: string, timezone: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(value))
  const buttonClass =
    presentation.buttonStyle === "pill"
      ? "rounded-full"
      : presentation.buttonStyle === "square"
        ? "rounded-none"
        : "rounded-lg"
  const buttonStyle: CSSProperties = {
    backgroundColor: "var(--booking-accent)",
    color: "var(--section-accent-foreground)",
  }
  const style: CSSProperties = {
    backgroundColor: presentation.background || "var(--section-surface)",
    color: presentation.textColor || "var(--section-surface-foreground)",
    fontFamily: presentation.fontFamily,
    "--booking-accent": presentation.accentColor || "var(--section-accent)",
  } as CSSProperties
  if (!available.length)
    return isPreview ? (
      <div className="mt-8 rounded-xl border border-dashed p-5 text-sm">
        Activeer boekbare opties bij Diensten → Opties om ‘Jouw boeking’ te
        tonen.
      </div>
    ) : null
  return (
    <div
      className="mt-10 rounded-2xl border border-border p-5 shadow-sm sm:p-8"
      style={style}
      data-booking-cart
    >
      <header className="mb-7 space-y-2">
        {presentation.logo ? (
          <MediaImage mediaControls={false}
            src={presentation.logo}
            alt="Bedrijfslogo"
            className="mb-4 h-14 max-w-48 object-contain"
          />
        ) : null}
        <h3 className="text-2xl font-bold">{presentation.title}</h3>
        <p className="text-sm opacity-75">{presentation.intro}</p>
        {isPreview ? (
          <p className="text-xs font-medium">
            Voorbeeld · tijden zijn gesimuleerd en er wordt niets geboekt.
          </p>
        ) : null}
      </header>
      {success ? (
        <div role="status" className="space-y-3 rounded-xl border p-6">
          <h4 className="text-xl font-semibold">
            {isPreview
              ? "Voorbeeld voltooid"
              : success === "confirmed"
                ? "Je afspraak is bevestigd"
                : "Je boekingsaanvraag is ontvangen"}
          </h4>
          <p>
            {isPreview
              ? "In de gepubliceerde versie wordt hier de boeking vastgelegd."
              : presentation.successText}
          </p>
          <p className="text-sm">{presentation.paymentInstructions}</p>
          {presentation.showPrices ? (
            <p className="font-semibold">
              Totaal: {formatMinorUnits(total, "EUR", locale)}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <ol
            className="mb-6 flex flex-wrap gap-3 text-xs"
            aria-label="Boekingsstappen"
          >
            {["Diensten kiezen", "Moment kiezen", "Gegevens en bevestigen"].map(
              (label, index) => (
                <li
                  key={label}
                  aria-current={step === index + 1 ? "step" : undefined}
                  className={step === index + 1 ? "font-bold" : "opacity-60"}
                >
                  {index + 1}. {label}
                </li>
              ),
            )}
          </ol>
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"
            >
              {error}
            </p>
          ) : null}
          <div
            className={
              presentation.layout === "beside"
                ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.6fr)]"
                : "space-y-6"
            }
          >
            <div className="min-w-0">
              {step === 1 ? (
                <div className="space-y-4">
                  <fieldset disabled={busy} className="space-y-3">
                    <legend className="mb-3 font-semibold">
                      Welke diensten wil je boeken?
                    </legend>
                    {available.map((service) => {
                      const index = selection.findIndex(
                          (row) => row.service_id === service.id,
                        ),
                        selected = selection[index],
                        catalog = service.booking_catalog
                      const variant = selected
                        ? catalog.variants.find(
                            (row) => row.id === selected.variant_id,
                          )
                        : undefined
                      return (
                        <div key={service.id} className="rounded-xl border p-4">
                          <label className="flex items-center gap-3 font-semibold">
                            <input
                              type="checkbox"
                              checked={Boolean(selected)}
                              disabled={!selected && selection.length >= 10}
                              onChange={(event) =>
                                changeSelection(
                                  event.target.checked
                                    ? [
                                        ...selection,
                                        {
                                          service_id: service.id,
                                          variant_id: catalog.variants[0].id,
                                          extra_ids: [],
                                        },
                                      ]
                                    : selection.filter(
                                        (row) => row.service_id !== service.id,
                                      ),
                                )
                              }
                            />
                            {service.title}
                          </label>
                          {selected ? (
                            <div className="mt-4 space-y-3 pl-6">
                              <label className="block text-sm">
                                Uitvoering
                                <select
                                  className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3"
                                  value={selected.variant_id}
                                  onChange={(event) =>
                                    updateItem(index, {
                                      variant_id: event.target.value,
                                      extra_ids: [],
                                    })
                                  }
                                >
                                  {catalog.variants.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name} · {option.duration_minutes}{" "}
                                      min
                                      {presentation.showPrices
                                        ? ` · ${formatMinorUnits(Math.round(option.price_minor * (1 + catalog.vat_rate_basis_points / 10000)), "EUR", locale)}`
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {catalog.extras
                                .filter(
                                  (extra) =>
                                    (!extra.variant_ids.length ||
                                      extra.variant_ids.includes(
                                        variant?.id ?? "",
                                      )) &&
                                    !presentation.hiddenExtraIds.includes(
                                      `${service.id}:${extra.id}`,
                                    ),
                                )
                                .map((extra) => (
                                  <label
                                    key={extra.id}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1"
                                      checked={selected.extra_ids.includes(
                                        extra.id,
                                      )}
                                      onChange={(event) => {
                                        const retained =
                                          selected.extra_ids.filter(
                                            (id) =>
                                              id !== extra.id &&
                                              (!event.target.checked ||
                                                !extra.exclusive_group ||
                                                catalog.extras.find(
                                                  (row) => row.id === id,
                                                )?.exclusive_group !==
                                                  extra.exclusive_group),
                                          )
                                        updateItem(index, {
                                          extra_ids: event.target.checked
                                            ? [...retained, extra.id]
                                            : retained,
                                        })
                                      }}
                                    />
                                    <span>
                                      {extra.name}
                                      {extra.duration_minutes
                                        ? ` · +${extra.duration_minutes} min`
                                        : ""}
                                      {presentation.showPrices
                                        ? ` · +${formatMinorUnits(Math.round(extra.price_minor * (1 + catalog.vat_rate_basis_points / 10000)), "EUR", locale)}`
                                        : ""}
                                    </span>
                                  </label>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </fieldset>
                  {selectionError ? (
                    <p role="alert" className="text-sm text-red-700">
                      {selectionError}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    className={buttonClass}
                    style={buttonStyle}
                    disabled={!lines.length || Boolean(selectionError) || busy}
                    onClick={() => setStep(2)}
                  >
                    Kies een moment
                  </Button>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium">
                    Kies een datum
                    <Input
                      type="date"
                      className="mt-2"
                      min={localDateForInstant(new Date(), "Europe/Amsterdam")}
                      max={addLocalDays(
                        localDateForInstant(new Date(), "Europe/Amsterdam"),
                        730,
                      )}
                      value={date}
                      disabled={busy}
                      onChange={(event) => {
                        clearTime()
                        setDate(event.target.value)
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    className={buttonClass}
                    style={buttonStyle}
                    disabled={busy || !date}
                    onClick={findTimes}
                  >
                    {busy
                      ? "Beschikbaarheid controleren…"
                      : "Bekijk beschikbare tijden"}
                  </Button>
                  {searched && !plans.length ? (
                    <p role="status" className="text-sm">
                      Op deze dag past de volledige combinatie niet. Kies een
                      andere datum.
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {plans.map((plan) => (
                      <Button
                        type="button"
                        key={plan.start_at}
                        variant="outline"
                        disabled={busy}
                        onClick={() => chooseTime(plan)}
                      >
                        {formatTime(plan.start_at, plan.timezone)}–
                        {formatTime(plan.end_at, plan.timezone)}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    disabled={busy}
                    onClick={() => setStep(1)}
                  >
                    Diensten wijzigen
                  </Button>
                </div>
              ) : null}
              {step === 3 && hold ? (
                <form onSubmit={submit} className="space-y-4">
                  <fieldset disabled={busy} className="space-y-4">
                    <legend className="mb-3 font-semibold">Je gegevens</legend>
                    <label className="block text-sm">
                      Naam
                      <Input
                        required
                        autoComplete="name"
                        maxLength={120}
                        value={customer.name}
                        onChange={(event) =>
                          setCustomer({ ...customer, name: event.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      E-mailadres
                      <Input
                        required
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        value={customer.email}
                        onChange={(event) =>
                          setCustomer({
                            ...customer,
                            email: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Telefoonnummer (optioneel)
                      <Input
                        type="tel"
                        autoComplete="tel"
                        maxLength={40}
                        value={customer.phone}
                        onChange={(event) =>
                          setCustomer({
                            ...customer,
                            phone: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Opmerking (optioneel)
                      <Textarea
                        maxLength={3000}
                        value={customer.message}
                        onChange={(event) =>
                          setCustomer({
                            ...customer,
                            message: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="hidden" aria-hidden="true">
                      Bedrijf
                      <Input
                        tabIndex={-1}
                        autoComplete="off"
                        value={customer.company}
                        onChange={(event) =>
                          setCustomer({
                            ...customer,
                            company: event.target.value,
                          })
                        }
                      />
                    </label>
                    <p className="rounded-lg border p-3 text-sm">
                      {presentation.paymentInstructions}
                    </p>
                    <p className="text-xs opacity-75">
                      {confirmationMode === "request"
                        ? "De ondernemer beoordeelt je aanvraag voordat je afspraak vaststaat."
                        : "Je afspraak staat na bevestiging direct vast."}{" "}
                      Je rekent rechtstreeks met de ondernemer af.
                    </p>
                    <Button
                      type="submit"
                      className={buttonClass}
                      style={buttonStyle}
                      disabled={busy}
                    >
                      {busy
                        ? "Boeking opslaan…"
                        : presentation.buttonLabel ||
                          (confirmationMode === "request"
                            ? "Boeking aanvragen"
                            : "Afspraak bevestigen")}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      disabled={busy}
                      onClick={() => {
                        clearTime()
                        setStep(2)
                      }}
                    >
                      Ander moment kiezen
                    </Button>
                  </fieldset>
                </form>
              ) : null}
            </div>
            <aside
              className="min-w-0 rounded-xl border p-5"
              aria-label="Boekingsoverzicht"
            >
              <h4 className="mb-4 font-semibold">Jouw selectie</h4>
              {!selection.length ? (
                <p className="text-sm opacity-70">
                  Je gekozen diensten verschijnen hier.
                </p>
              ) : (
                <ol className="space-y-4">
                  {selection.map((selected, index) => {
                    const line = lines.find(
                        (line) => line.service_id === selected.service_id,
                      ),
                      planItem = hold?.plan.items.find(
                        (item) => item.service_id === selected.service_id,
                      )
                    return (
                      <li
                        key={selected.service_id}
                        className="border-b pb-3 text-sm"
                      >
                        <p className="font-medium">
                          {line?.description ||
                            available.find(
                              (service) => service.id === selected.service_id,
                            )?.title}
                        </p>
                        {line ? (
                          <p className="mt-1 opacity-75">
                            {line.duration_minutes} minuten
                            {presentation.showPrices
                              ? ` · ${formatMinorUnits(line.price_minor, "EUR", locale)}`
                              : ""}
                          </p>
                        ) : null}
                        {planItem ? (
                          <p className="mt-1">
                            {formatTime(planItem.start_at, hold!.plan.timezone)}
                            –{formatTime(planItem.end_at, hold!.plan.timezone)}
                          </p>
                        ) : null}
                        {step === 1 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label="Dienst eerder plannen"
                              disabled={index === 0 || busy}
                              onClick={() => {
                                const next = [...selection]
                                ;[next[index - 1], next[index]] = [
                                  next[index],
                                  next[index - 1],
                                ]
                                changeSelection(next)
                              }}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label="Dienst later plannen"
                              disabled={index === selection.length - 1 || busy}
                              onClick={() => {
                                const next = [...selection]
                                ;[next[index + 1], next[index]] = [
                                  next[index],
                                  next[index + 1],
                                ]
                                changeSelection(next)
                              }}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                changeSelection(
                                  selection.filter(
                                    (row) =>
                                      row.service_id !== selected.service_id,
                                  ),
                                )
                              }
                            >
                              Verwijderen
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              )}
              {lines.length ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p>{duration} minuten behandeltijd</p>
                  {hold ? (
                    <p>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "long",
                        timeZone: hold.plan.timezone,
                      }).format(new Date(hold.plan.start_at))}
                      <br />
                      {formatTime(hold.plan.start_at, hold.plan.timezone)}–
                      {formatTime(hold.plan.end_at, hold.plan.timezone)} ·{" "}
                      {hold.plan.timezone}
                    </p>
                  ) : null}
                  {presentation.showPrices ? (
                    <p className="flex justify-between gap-3 text-base font-bold">
                      <span>Totaal incl. btw</span>
                      <span>{formatMinorUnits(total, "EUR", locale)}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
