"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PricingPlan } from "@/lib/types/pricing"
import { Calendar, CreditCard, Settings } from "lucide-react"
import { formatPrice } from "@/lib/pricing"
import { handleManageSubscription } from "@/lib/stripe-placeholder"
import { toast } from "sonner"

interface BillingSummarySidebarProps {
  currentPlan: PricingPlan
  nextBillingDate: Date
  monthlyCharge: number
  addonsPrice?: number
  onManageSubscription?: () => void
  onEditPayment?: () => void
}

/**
 * Billing Summary Sidebar Component
 * Displays current plan, next billing date, and quick actions
 */
export function BillingSummarySidebar({
  currentPlan,
  nextBillingDate,
  monthlyCharge,
  addonsPrice = 0,
  onManageSubscription,
  onEditPayment,
}: BillingSummarySidebarProps) {
  const totalCharge = monthlyCharge + addonsPrice

  const handleManageClick = async () => {
    if (onManageSubscription) {
      onManageSubscription()
    } else {
      await handleManageSubscription("")
      toast.info("Zou naar het Stripe Customer Portal verwijzen")
    }
  }

  return (
    <Card className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 sticky top-24">
      {/* Plan header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
          Huidig abonnement
        </p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          {currentPlan.name}
        </h3>
      </div>

      {/* Pricing breakdown */}
      <div className="space-y-3 mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {currentPlan.name} abonnement
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatPrice(monthlyCharge)}
          </span>
        </div>

        {addonsPrice > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Add-ons</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              +{formatPrice(addonsPrice)}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-slate-900 dark:text-white">Totaalbedrag</span>
          <span className="text-[var(--brand-blue)] dark:text-[var(--brand-blue)]">
            {formatPrice(totalCharge)}/mnd
          </span>
        </div>
      </div>

      {/* Next billing date */}
      <div className="flex items-start gap-3 mb-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
            Volgende facturering
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
            {nextBillingDate.toLocaleDateString("nl-NL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleManageClick}
          className="w-full gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
        >
          <Settings className="h-4 w-4" />
          Abonnement beheren
        </Button>

        <Button
          onClick={onEditPayment}
          variant="outline"
          className="w-full gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Betaalmethode wijzigen
        </Button>
      </div>

      {/* Info text */}
      <p className="text-xs text-slate-500 dark:text-slate-500 mt-6 text-center leading-relaxed">
        Je abonnement wordt automatisch verlengd. Je kunt altijd opzeggen.
      </p>
    </Card>
  )
}
