"use client"

import { useEffect, useState } from "react"

import { BillingStatusBadge } from "@/components/billing/billing-status-badge"
import { AddonToggleCard } from "@/components/billing/addon-toggle-card"
import { BillingSummarySidebar } from "@/components/billing/billing-summary-sidebar"
import { InvoiceHistoryTable } from "@/components/billing/invoice-history-table"
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table"
import { Card } from "@/components/ui/card"
import { getPlanById, BOOKING_ADDON_NAME, BOOKING_ADDON_FEATURES, BOOKING_ADDON_MONTHLY_PRICE, MULTILINGUAL_ADDON_MONTHLY_PRICE, formatPrice } from "@/lib/pricing"
import type { UserBillingData } from "@/lib/types/pricing"

interface BillingClientProps {
  billingData: UserBillingData
  userId: string
}

export function BillingClient({ billingData, userId }: BillingClientProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentPlan = getPlanById(billingData.currentPlan)
  const bookingAddonPrice = !billingData.defaultFeaturesIncluded && billingData.addons.bookingAddon ? BOOKING_ADDON_MONTHLY_PRICE : 0
  const multilingualAddonPrice = !billingData.defaultFeaturesIncluded && currentPlan.id !== "gold" && billingData.addons.multilingualAddon
    ? MULTILINGUAL_ADDON_MONTHLY_PRICE
    : 0

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 rounded-xl bg-secondary" />
        <div className="h-96 rounded-xl bg-secondary" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6 pb-20 [overflow-wrap:anywhere] sm:space-y-8">
      <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-foreground">
        <span className="font-semibold">Let op:</span> alle vermelde abonnements- en add-onprijzen zijn exclusief btw.
      </div>

      <Card className="min-w-0 rounded-xl border border-border bg-secondary/70 p-4 shadow-sm animate-in fade-in duration-700 sm:p-8">
        {billingData.defaultFeaturesIncluded ? (
          <p className="mb-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-foreground">
            Alle functies zijn tijdelijk gratis beschikbaar voor iedereen, inclusief Gold, Booking &amp; Facturatie en meertaligheid.
          </p>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Huidig abonnement
            </p>
            <h2 className="text-3xl font-bold text-foreground">{currentPlan.name}</h2>
            <p className="mt-1 text-muted-foreground">{currentPlan.description}</p>
          </div>

          <BillingStatusBadge status={billingData.status} />
        </div>
        {!billingData.defaultFeaturesIncluded && billingData.source === "default_fallback" ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Er is geen actief betaald abonnement gevonden. Daarom geldt voorlopig het standaardabonnement Gold.
          </p>
        ) : null}
        {!billingData.defaultFeaturesIncluded && billingData.accessNotice ? (
          <p className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
            {billingData.accessNotice}
          </p>
        ) : null}
      </Card>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:gap-8">
        <div className="min-w-0 space-y-8">
          <div className="animate-in fade-in duration-700 delay-200">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Abonnementen vergelijken
            </h3>
            <PlanComparisonTable currentPlanId={billingData.currentPlan} userId={userId} />
            <p className="mt-3 text-sm text-muted-foreground">
              Abonnement wijzigen wordt beschikbaar zodra de betaalprovider is gekoppeld.
            </p>
          </div>

          <div className="animate-in fade-in duration-700 delay-300">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Add-ons
            </h3>
            <div className="mb-4">
              <AddonToggleCard
                addonId="bookingAddon"
                addonName={BOOKING_ADDON_NAME}
                isEnabled={billingData.addons.bookingAddon}
                included={billingData.defaultFeaturesIncluded}
                includedLabel="Tijdelijk gratis inbegrepen"
                changesEnabled={false}
                monthlyPrice={BOOKING_ADDON_MONTHLY_PRICE}
                features={BOOKING_ADDON_FEATURES}
              />
            </div>
            <AddonToggleCard
              addonId="multilingualAddon"
              addonName="Meertaligheid"
              isEnabled={billingData.addons.multilingualAddon}
              included={currentPlan.id === "gold" || billingData.defaultFeaturesIncluded}
              includedLabel={billingData.defaultFeaturesIncluded ? "Tijdelijk gratis inbegrepen" : "Inbegrepen bij Gold"}
              changesEnabled={false}
              monthlyPrice={MULTILINGUAL_ADDON_MONTHLY_PRICE}
              features={[
                "Nederlands, Engels, Duits en Frans",
                "Vertaalbare navigatie en website-inhoud",
                "Taalkeuze op de gepubliceerde website",
              ]}
            />
          </div>

          <div className="animate-in fade-in duration-700 delay-300">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Factuuroverzicht
            </h3>
            <InvoiceHistoryTable invoices={billingData.invoices} />
          </div>
        </div>

        <div className="min-w-0 animate-in fade-in duration-700 delay-300">
          <BillingSummarySidebar
            currentPlan={currentPlan}
            nextBillingDate={billingData.nextBillingDate}
            monthlyCharge={billingData.currentPrice}
            addonsPrice={bookingAddonPrice + multilingualAddonPrice}
            complimentary={billingData.defaultFeaturesIncluded}
          />
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-6 shadow-sm animate-in fade-in duration-700 delay-500">
        <h4 className="mb-2 font-semibold text-foreground">
          Informatie over uw abonnement
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Alle vermelde abonnements- en add-onprijzen zijn exclusief btw.</li>
          {billingData.defaultFeaturesIncluded ? (
            <li>U kunt alle functies gratis gebruiken. Betaalde abonnementen zijn nog niet beschikbaar.</li>
          ) : (
            <li>Uw abonnement wordt automatisch maandelijks verlengd. U kunt op elk moment van abonnement wisselen.</li>
          )}
          <li>{BOOKING_ADDON_NAME} bevat boekingen, beschikbaarheid, bevestigingen, klantgegevens en facturen vanuit boekingen, inclusief PDF en historie. {billingData.defaultFeaturesIncluded ? "Deze functies zijn voorlopig standaard beschikbaar." : `De add-on kost ${formatPrice(BOOKING_ADDON_MONTHLY_PRICE)} per maand extra.`}</li>
          <li>{billingData.defaultFeaturesIncluded ? "Meertaligheid is voorlopig standaard beschikbaar voor iedereen." : "Meertaligheid is inbegrepen bij Gold en kost bij Bronze of Silver € 2,99 per maand extra."}</li>
          <li>Priority support is inbegrepen bij Gold.</li>
        </ul>
      </div>
    </div>
  )
}
