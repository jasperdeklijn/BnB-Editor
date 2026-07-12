"use client"

import { useState } from "react"
import { FlaskConical, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import type { PlanId } from "@/lib/types/pricing"

interface TierTestSwitchProps {
  realPlan: PlanId
  effectivePlan: PlanId
  isOverridden: boolean
}

export function TierTestSwitch({ realPlan, effectivePlan, isOverridden }: TierTestSwitchProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePlan = async (value: string) => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch("/api/dev/tier-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: value === "real" ? null : value }),
      })
      if (!response.ok) throw new Error("Testabonnement kon niet worden gewijzigd")
      router.refresh()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Testabonnement kon niet worden gewijzigd")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-900">
      {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
      <label htmlFor="tier-test-switch" className="font-semibold">Testabonnement</label>
      <select
        id="tier-test-switch"
        value={isOverridden ? effectivePlan : "real"}
        onChange={(event) => updatePlan(event.target.value)}
        disabled={isUpdating}
        className="h-7 rounded border border-amber-500/40 bg-background px-1.5 text-xs text-foreground"
      >
        <option value="real">Werkelijk ({realPlan})</option>
        <option value="bronze">Bronze</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
      </select>
      {error ? <span className="font-medium text-destructive" role="alert">{error}</span> : null}
    </div>
  )
}
