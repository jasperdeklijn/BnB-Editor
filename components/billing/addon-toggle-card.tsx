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
      await fetch("/api/audit/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscription.changed",
          metadata: {
            addonId,
            enabled: pendingState,
            source: "billing_addon_toggle",
          },
        }),
      }).catch(() => null)

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
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {addonName}
              </h3>
              <p className="text-sm text-muted-foreground">
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
          <p className="text-sm font-semibold text-foreground mb-4">
            Inclusief:
          </p>
          <FeatureList features={features} className="mb-6" />
        </div>

        {/* Status */}
        {isEnabled && (
          <div className="mt-6 p-3 bg-success/10 border border-success/30 rounded-lg">
            <p className="text-sm text-success font-medium">
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
                  ? "bg-primary hover:bg-primary/90"
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
