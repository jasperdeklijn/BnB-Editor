"use client"

import { useState, useEffect } from "react"
import { MockUserBillingData } from "@/lib/types/pricing"
import { getPlanById, calculateMonthlyPrice } from "@/lib/pricing"
import { BillingStatusBadge } from "@/components/billing/billing-status-badge"
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table"
import { InvoiceHistoryTable } from "@/components/billing/invoice-history-table"
import { AddonToggleCard } from "@/components/billing/addon-toggle-card"
import { BillingSummarySidebar } from "@/components/billing/billing-summary-sidebar"
import { Card } from "@/components/ui/card"

interface BillingClientProps {
  billingData: MockUserBillingData
  userId: string
}

/**
 * Billing Dashboard Client Component
 * Main client component that orchestrates the billing dashboard
 */
export function BillingClient({ billingData, userId }: BillingClientProps) {
  const [addonStates, setAddonStates] = useState({
    bookingAddon: billingData.addons.bookingAddon,
  })

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentPlan = getPlanById(billingData.currentPlan)
  const basePrice = billingData.currentPrice
  const addonsPrice = addonStates.bookingAddon ? 19 : 0
  const totalPrice = basePrice + addonsPrice

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 rounded-xl bg-secondary" />
        <div className="h-96 rounded-xl bg-secondary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Current Plan Card */}
      <Card className="rounded-xl border border-border bg-secondary/70 p-8 shadow-sm animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Huidig abonnement
            </p>
            <h2 className="text-3xl font-bold text-foreground">
              {currentPlan.name}
            </h2>
            <p className="text-muted-foreground mt-1">
              {currentPlan.description}
            </p>
          </div>

          <BillingStatusBadge status={billingData.status} />
        </div>
      </Card>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Plan Comparison */}
          <div className="animate-in fade-in duration-700 delay-200">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Pläne vergleichen
            </h3>
            <PlanComparisonTable
              currentPlanId={billingData.currentPlan}
              userId={userId}
            />
          </div>

          {/* Add-on Card */}
          <div className="animate-in fade-in duration-700 delay-300">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Add-ons
            </h3>
            <AddonToggleCard
              addonId="bookingAddon"
              addonName="Booking Add-on"
              isEnabled={addonStates.bookingAddon}
              monthlyPrice={19}
              features={[
                "Aanvragen van klanten",
                "Beschikbaarheidskalender",
                "Reserveringsbeheer",
                "Gastcommunicatie",
                "Automatische bevestigingsmails",
              ]}
              userId={userId}
              onToggle={(enabled) =>
                setAddonStates((prev) => ({
                  ...prev,
                  bookingAddon: enabled,
                }))
              }
            />
          </div>

          {/* Invoice History */}
          <div className="animate-in fade-in duration-700 delay-400">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Factuuroverzicht
            </h3>
            <InvoiceHistoryTable invoices={billingData.invoices} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 animate-in fade-in duration-700 delay-300">
          <BillingSummarySidebar
            currentPlan={currentPlan}
            nextBillingDate={billingData.nextBillingDate}
            monthlyCharge={basePrice}
            addonsPrice={addonsPrice}
          />
        </div>
      </div>

      {/* Info box */}
      <div className="mt-12 rounded-xl border border-border bg-card p-6 shadow-sm animate-in fade-in duration-700 delay-500">
        <h4 className="font-semibold text-foreground mb-2">
          Info zum Abonnement
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            ✓ Je kunt op elk moment van abonnement wisselen
          </li>
          <li>
            ✓ Je abonnement wordt automatisch maandelijks verlengd
          </li>
          <li>
            ✓ Je ontvangt 30 dagen geld-terug-garantie
          </li>
          <li>
            ✓ 24/7 klantenondersteuning is beschikbaar
          </li>
        </ul>
      </div>
    </div>
  )
}

