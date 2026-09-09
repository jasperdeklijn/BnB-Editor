"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PricingPlan } from "@/lib/types/pricing"
import { Calendar, CreditCard, Settings } from "lucide-react"
import { formatPrice } from "@/lib/pricing"

interface BillingSummarySidebarProps {
  currentPlan: PricingPlan
  nextBillingDate: Date | null
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

  return (
    <Card className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6 xl:sticky xl:top-24">
      {/* Plan header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Huidig abonnement
        </p>
        <h3 className="text-2xl font-bold text-foreground">
          {currentPlan.name}
        </h3>
      </div>

      {/* Pricing breakdown */}
      <div className="space-y-3 mb-8 pb-8 border-b border-border">
        <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {currentPlan.name} abonnement
          </span>
          <span className="font-semibold text-foreground">
            {formatPrice(monthlyCharge)}
          </span>
        </div>

        {addonsPrice > 0 && (
          <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
            <span className="text-muted-foreground">Add-ons</span>
            <span className="font-semibold text-foreground">
              +{formatPrice(addonsPrice)}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex flex-wrap justify-between items-center gap-2 text-base font-bold pt-2 border-t border-border">
          <span className="text-foreground">Totaalbedrag</span>
          <span className="text-primary">
            {formatPrice(totalCharge)}/mnd
          </span>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          Exclusief btw
        </p>
      </div>

      {/* Next billing date */}
      <div className="flex items-start gap-3 mb-8 p-4 rounded-lg bg-secondary border border-border">
        <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-secondary-foreground uppercase tracking-wide">
            Volgende facturering
          </p>
          <p className="text-sm text-primary font-semibold">
            {nextBillingDate ? nextBillingDate.toLocaleDateString("nl-NL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }) : "Geen geplande facturering"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          onClick={onManageSubscription}
          disabled={!onManageSubscription}
          className="h-auto min-h-11 w-full gap-2 whitespace-normal py-2"
        >
          <Settings className="h-4 w-4" />
          <span>{onManageSubscription ? "Abonnement beheren" : "Abonnement beheren — binnenkort"}</span>
        </Button>

        <Button
          onClick={onEditPayment}
          disabled={!onEditPayment}
          variant="outline"
          className="h-auto min-h-11 w-full gap-2 whitespace-normal py-2"
        >
          <CreditCard className="h-4 w-4" />
          <span>Betaalmethode wijzigen</span>
        </Button>
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
        Je abonnement wordt automatisch verlengd. Je kunt altijd opzeggen.
      </p>
    </Card>
  )
}
