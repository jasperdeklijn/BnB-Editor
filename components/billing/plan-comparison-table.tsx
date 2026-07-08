"use client"

import { Button } from "@/components/ui/button"
import { FEATURE_COMPARISON, PLAN_ORDER, formatPrice, getMainPlans } from "@/lib/pricing"
import { PlanId } from "@/lib/types/pricing"
import { CheckCircle2, X, ArrowRight } from "lucide-react"
import { handleUpgrade, handleDowngrade } from "@/lib/stripe-placeholder"
import { toast } from "sonner"
import { useState } from "react"

interface PlanComparisonTableProps {
  currentPlanId: PlanId
  userId: string
}

/**
 * Plan Comparison Table Component
 * Shows feature comparison across all plans with upgrade/downgrade buttons
 */
export function PlanComparisonTable({
  currentPlanId,
  userId,
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

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
              Functie
            </th>
            {mainPlans.map((plan) => (
              <th
                key={plan.id}
                className="px-6 py-4 text-center text-sm font-semibold text-foreground"
              >
                <div>{plan.name}</div>
                <div className="text-base font-bold text-primary mt-1">
                  {formatPrice(plan.monthlyPrice)}
                  <span className="text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_COMPARISON.map((row, index) => (
            <tr
              key={`feature-${index}`}
              className={index % 2 === 0 ? "bg-white" : ""}
            >
              <td className="px-6 py-4 text-sm font-medium text-foreground border-r border-border">
                {row.feature}
              </td>
              {mainPlans.map((plan) => {
                const value = row[plan.id]
                return (
                  <td
                    key={`${row.feature}-${plan.id}`}
                    className="px-6 py-4 text-center text-sm"
                  >
                    {typeof value === "boolean" ? (
                      value ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
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
            <td className="px-6 py-4"></td>
            {mainPlans.map((plan) => (
              <td key={`action-${plan.id}`} className="px-6 py-4 text-center">
                {plan.id === currentPlanId ? (
                  <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Huidig abonnement
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={isLoading && selectedPlan === plan.id}
                    className="gap-2"
                  >
                    {PLAN_ORDER.indexOf(plan.id) > PLAN_ORDER.indexOf(currentPlanId)
                      ? "Upgraden"
                      : "Downgraden"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
