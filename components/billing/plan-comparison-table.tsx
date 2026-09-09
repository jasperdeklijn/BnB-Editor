"use client"

import { Button } from "@/components/ui/button"
import { FEATURE_COMPARISON, PLAN_ORDER, formatPrice, getMainPlans } from "@/lib/pricing"
import type { PlanId } from "@/lib/types/pricing"
import { CheckCircle2, X, ArrowRight } from "lucide-react"
import { handleUpgrade, handleDowngrade } from "@/lib/stripe-placeholder"
import { toast } from "sonner"
import { useState } from "react"

interface PlanComparisonTableProps {
  currentPlanId: PlanId
  userId: string
  planChangesEnabled?: boolean
}

/**
 * Plan Comparison Table Component
 * Shows feature comparison across all plans with upgrade/downgrade buttons
 */
export function PlanComparisonTable({
  currentPlanId,
  userId,
  planChangesEnabled = false,
}: PlanComparisonTableProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mainPlans = getMainPlans()

  const handlePlanChange = async (newPlanId: PlanId) => {
    if (newPlanId === currentPlanId) {
      toast.info("Je gebruikt dit abonnement al")
      return
    }

    setSelectedPlan(newPlanId)
    setIsLoading(true)

    try {
      const currentPlanIndex = PLAN_ORDER.indexOf(currentPlanId)
      const newPlanIndex = PLAN_ORDER.indexOf(newPlanId)

      if (newPlanIndex > currentPlanIndex) {
        await handleUpgrade(newPlanId, userId)
        toast.success("Plan succesvol bijgewerkt!")
      } else {
        await handleDowngrade(newPlanId, userId)
        toast.success("Plan succesvol teruggezet!")
      }

      await fetch("/api/audit/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscription.changed",
          metadata: {
            previousPlan: currentPlanId,
            nextPlan: newPlanId,
            source: "billing_plan_comparison",
          },
        }),
      }).catch(() => null)

      // Reset selection
      setSelectedPlan(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Etwas ist schief gelaufen"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const planAction = (planId: PlanId) => planId === currentPlanId ? (
    <span className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>Huidig abonnement</span>
    </span>
  ) : (
    <Button
      size="sm"
      onClick={() => handlePlanChange(planId)}
      disabled={!planChangesEnabled || isLoading}
      className="h-auto min-h-11 w-full gap-2 whitespace-normal px-3 py-2"
    >
      <span>{isLoading && selectedPlan === planId ? "Bezig…" : planChangesEnabled
        ? PLAN_ORDER.indexOf(planId) > PLAN_ORDER.indexOf(currentPlanId) ? "Upgraden" : "Downgraden"
        : "Binnenkort beschikbaar"}</span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Button>
  )

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 gap-4 @[48rem]:hidden">
        {mainPlans.map((plan) => (
          <section key={plan.id} aria-label={`${plan.name} abonnement`} className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h4 className="text-lg font-semibold text-foreground">{plan.name}</h4>
              <p className="text-lg font-bold text-primary">{formatPrice(plan.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/maand</span></p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Exclusief btw</p>
            <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
            <details className="my-4">
              <summary className="cursor-pointer rounded-md py-3 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Alle functies bekijken</summary>
              <dl className="divide-y divide-border">
                {FEATURE_COMPARISON.map((row) => (
                  <div key={row.feature} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 py-3 text-sm">
                    <dt className="text-foreground [overflow-wrap:anywhere]">{row.feature}</dt>
                    <dd className="text-right text-muted-foreground [overflow-wrap:anywhere]">{typeof row[plan.id] === "boolean" ? row[plan.id] ? "Inbegrepen" : "Niet inbegrepen" : row[plan.id]}</dd>
                  </div>
                ))}
              </dl>
            </details>
            {planAction(plan.id)}
          </section>
        ))}
      </div>
      <div className="hidden rounded-xl border border-border bg-card shadow-sm @[48rem]:block">
      <table className="w-full table-fixed [overflow-wrap:anywhere]">
        <colgroup><col className="w-[34%]" /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-[22%]" /></colgroup>
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-foreground">
              Functie
            </th>
            {mainPlans.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                className="px-3 py-4 text-center text-sm font-semibold text-foreground"
              >
                <div>{plan.name}</div>
                <div className="text-base font-bold text-primary mt-1">
                  {formatPrice(plan.monthlyPrice)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    /maand
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                  Excl. btw
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_COMPARISON.map((row, index) => (
            <tr
              key={`feature-${index}`}
              className={index % 2 === 0 ? "bg-muted/30" : ""}
            >
              <th scope="row" className="px-3 py-4 text-left text-sm font-medium text-foreground border-r border-border">
                {row.feature}
              </th>
              {mainPlans.map((plan) => {
                const value = row[plan.id]
                return (
                  <td
                    key={`${row.feature}-${plan.id}`}
                    className="px-3 py-4 text-center text-sm"
                  >
                    {typeof value === "boolean" ? (
                      value ? (
                        <CheckCircle2 aria-label="Inbegrepen" className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <X aria-label="Niet inbegrepen" className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        {value}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          {/* Action row */}
          <tr className="border-t border-border bg-secondary/60">
            <td className="px-3 py-4"></td>
            {mainPlans.map((plan) => (
              <td key={`action-${plan.id}`} className="px-3 py-4 text-center">
                {planAction(plan.id)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  )
}
