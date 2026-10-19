"use client"

import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getCartPresentation } from "@/lib/booking/cart-settings"
import { bookingCatalogSchema } from "@/lib/booking/cart"

export function BookingCartSettings({
  data,
  updateField,
  hasBookingAccess,
  services,
}: {
  data: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  hasBookingAccess: boolean
  services: Array<{ id: string; name: string; booking_catalog?: unknown }>
}) {
  const settings = getCartPresentation(data)
  return (
    <div className="space-y-4 rounded-xl border p-3">
      <h3 className="text-sm font-semibold">Jouw boeking · boekingsadd-on</h3>
      {!hasBookingAccess ? (
        <p className="text-xs text-muted-foreground">
          Aanpassen vereist de boekingsadd-on.{" "}
          <Link href="/editor/account/billing" className="underline">
            Bekijk je add-ons
          </Link>
        </p>
      ) : null}
      <fieldset disabled={!hasBookingAccess} className="min-w-0 space-y-4">
        <label className="flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={data.bookingCartEnabled === true}
            onChange={(event) =>
              updateField("bookingCartEnabled", event.target.checked)
            }
          />
          Meerdere diensten en opties samen laten boeken
        </label>
        {data.bookingCartEnabled === true ? (
          <>
            <p className="text-xs text-muted-foreground">
              De vormgeving volgt standaard je website. Stel boekbare varianten
              en extra's in bij Diensten → Opties. Betaling verloopt
              rechtstreeks met de ondernemer.
            </p>
            {(
              [
                {
                  key: "bookingCartTitle",
                  value: settings.title,
                  label: "Titel",
                },
                {
                  key: "bookingCartButtonLabel",
                  value: settings.buttonLabel,
                  label: "Knoptekst (leeg = automatisch)",
                },
                {
                  key: "bookingCartLogo",
                  value: settings.logo,
                  label: "Logo (afbeeldingslink, leeg = website-logo)",
                },
              ] as const
            ).map((field) => (
              <label className="block text-xs" key={field.key}>
                {field.label}
                <Input
                  value={field.value}
                  maxLength={field.key === "bookingCartLogo" ? 2000 : 160}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                />
              </label>
            ))}
            {(
              [
                {
                  key: "bookingCartIntro",
                  value: settings.intro,
                  label: "Introductie",
                },
                {
                  key: "bookingCartSuccessText",
                  value: settings.successText,
                  label: "Bevestigingstekst",
                },
                {
                  key: "bookingCartPaymentInstructions",
                  value: settings.paymentInstructions,
                  label: "Betaalinstructies (ook in bevestigingsmail)",
                },
              ] as const
            ).map((field) => (
              <label className="block text-xs" key={field.key}>
                {field.label}
                <Textarea
                  value={field.value}
                  maxLength={1000}
                  rows={3}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={settings.showPrices}
                onChange={(event) =>
                  updateField("bookingCartShowPrices", event.target.checked)
                }
              />
              Prijzen en totaal tonen
            </label>
            <label className="block text-xs">
              Indeling
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-2"
                value={settings.layout}
                onChange={(event) =>
                  updateField("bookingCartLayout", event.target.value)
                }
              >
                <option value="beside">Overzicht naast de selectie</option>
                <option value="below">Overzicht onder de selectie</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    key: "bookingCartBackground",
                    value: settings.background,
                    label: "Achtergrond",
                  },
                  {
                    key: "bookingCartTextColor",
                    value: settings.textColor,
                    label: "Tekstkleur",
                  },
                  {
                    key: "bookingCartAccentColor",
                    value: settings.accentColor,
                    label: "Knopkleur",
                  },
                ] as const
              ).map((field) => (
                <label className="block text-xs" key={field.key}>
                  {field.label}
                  <Input
                    value={field.value}
                    placeholder="Websitekleur"
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
            <label className="block text-xs">
              Lettertype
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-2"
                value={settings.fontFamily}
                onChange={(event) =>
                  updateField("bookingCartFontFamily", event.target.value)
                }
              >
                <option value="inherit">Volg de website</option>
                <option value="sans-serif">Schreefloos</option>
                <option value="serif">Met schreef</option>
                <option value="monospace">Monospace</option>
              </select>
            </label>
            <label className="block text-xs">
              Knopstijl
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-2"
                value={settings.buttonStyle}
                onChange={(event) =>
                  updateField("bookingCartButtonStyle", event.target.value)
                }
              >
                <option value="rounded">Afgerond</option>
                <option value="square">Rechthoekig</option>
                <option value="pill">Rond</option>
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold">
                Extra's tonen in deze boekingslijst
              </legend>
              {services.flatMap((service) => {
                const parsed = bookingCatalogSchema.safeParse(
                  service.booking_catalog,
                )
                if (!parsed.success) return []
                return parsed.data.extras.map((extra) => {
                  const id = `${service.id}:${extra.id}`
                  return (
                    <label key={id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!settings.hiddenExtraIds.includes(id)}
                        onChange={(event) =>
                          updateField(
                            "bookingCartHiddenExtraIds",
                            event.target.checked
                              ? settings.hiddenExtraIds.filter(
                                  (key) => key !== id,
                                )
                              : [...settings.hiddenExtraIds, id],
                          )
                        }
                      />
                      {service.name} · {extra.name}
                    </label>
                  )
                })
              })}
            </fieldset>
          </>
        ) : null}
      </fieldset>
    </div>
  )
}
