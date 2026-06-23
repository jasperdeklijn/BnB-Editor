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
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Current Plan Card */}
      <Card className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 bg-gradient-to-br from-[var(--brand-blue)]/5 to-[var(--brand-purple)]/5 dark:from-[var(--brand-blue)]/10 dark:to-[var(--brand-purple)]/10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
              Huidig abonnement
            </p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {currentPlan.name}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
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
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Pläne vergleichen
            </h3>
            <PlanComparisonTable
              currentPlanId={billingData.currentPlan}
              userId={userId}
            />
          </div>

          {/* Add-on Card */}
          <div className="animate-in fade-in duration-700 delay-300">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
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
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
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
      <div className="mt-12 rounded-lg border border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-700 delay-500">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
          Info zum Abonnement
        </h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
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

