"use client"

import { Switch } from "@/components/ui/switch"
import { FeatureList } from "@/components/pricing/feature-list"
import { formatPrice } from "@/lib/pricing"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { handleAddonToggle } from "@/lib/stripe-placeholder"
import { toast } from "sonner"
import { Zap } from "lucide-react"

interface AddonToggleCardProps {
  addonId: "bookingAddon"
  addonName: string
  isEnabled: boolean
  monthlyPrice: number
  features: string[]
  userId: string
  onToggle?: (enabled: boolean) => void
}

/**
 * Addon Toggle Card Component
 * Allows users to enable/disable add-ons with confirmation
 */
export function AddonToggleCard({
  addonId,
  addonName,
  isEnabled,
  monthlyPrice,
  features,
  userId,
  onToggle,
}: AddonToggleCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingState, setPendingState] = useState(isEnabled)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleClick = (checked: boolean) => {
    setPendingState(checked)
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    setIsLoading(true)

    try {
      await handleAddonToggle(addonId, pendingState, userId)

      if (onToggle) {
        onToggle(pendingState)
      }

      toast.success(
        `${addonName} ${pendingState ? "geactiveerd" : "gedeactiveerd"}`
      )
      setShowConfirmation(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Er is iets misgegaan"
      )
      setPendingState(isEnabled)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 bg-gradient-to-br from-[var(--brand-blue)]/5 to-[var(--brand-purple)]/5 dark:from-[var(--brand-blue)]/10 dark:to-[var(--brand-purple)]/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-2 bg-[var(--brand-blue)]/10 dark:bg-[var(--brand-blue)]/20 rounded-lg">
              <Zap className="h-6 w-6 text-[var(--brand-blue)] dark:text-[var(--brand-blue)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                {addonName}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatPrice(monthlyPrice)}/maand
              </p>
            </div>
          </div>

          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleClick}
            disabled={isLoading}
            className="ml-4"
          />
        </div>

        {/* Features */}
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Inclusief:
          </p>
          <FeatureList features={features} className="mb-6" />
        </div>

        {/* Status */}
        {isEnabled && (
          <div className="mt-6 p-3 bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-lg">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              ✓ Momenteel geactiveerd
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingState ? `${addonName} activeren?` : `${addonName} deactiveren?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingState
                ? `${formatPrice(monthlyPrice)}/maand wordt toegevoegd aan je volgende factuur.`
                : `Je verliest toegang tot deze functies na je volgende factuurdatum.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading}
              className={
                pendingState
                  ? "bg-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/90"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isLoading
                ? "Bezig met verwerken..."
                : pendingState
                  ? "Activeren"
                  : "Deactiveren"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
