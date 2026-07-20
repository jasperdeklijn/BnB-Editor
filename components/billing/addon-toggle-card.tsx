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
import { toast } from "sonner"
import { CheckCircle2, Zap } from "lucide-react"

interface AddonToggleCardProps {
  addonId: "bookingAddon" | "multilingualAddon"
  addonName: string
  isEnabled: boolean
  monthlyPrice: number
  features: string[]
  included?: boolean
  changesEnabled?: boolean
  onToggle?: (enabled: boolean) => void
}

/**
 * Addon Toggle Card Component
 * Allows users to enable/disable add-ons with confirmation
 */
export function AddonToggleCard({
  addonName,
  isEnabled,
  monthlyPrice,
  features,
  included = false,
  changesEnabled = false,
  onToggle,
}: AddonToggleCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingState, setPendingState] = useState(isEnabled)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleClick = (checked: boolean) => {
    if (included || !changesEnabled) return
    setPendingState(checked)
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    setIsLoading(true)

    try {
      if (!onToggle) throw new Error("Add-ons wijzigen is nog niet beschikbaar.")
      await onToggle(pendingState)

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
                {included ? "Inbegrepen bij Gold" : `${formatPrice(monthlyPrice)}/maand`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Exclusief btw
              </p>
            </div>
          </div>

          <Switch
            checked={included || isEnabled}
            onCheckedChange={handleToggleClick}
            disabled={isLoading || included || !changesEnabled}
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
        {included ? (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm font-medium">Inbegrepen bij uw Gold-abonnement</p>
          </div>
        ) : isEnabled ? (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="text-sm font-medium text-success">Momenteel geactiveerd</p>
          </div>
        ) : !changesEnabled ? (
          <div className="mt-6 rounded-lg border border-border bg-secondary/60 p-3">
            <p className="text-sm font-medium text-foreground">Activeren via facturering volgt binnenkort</p>
            <p className="mt-1 text-xs text-muted-foreground">De toegangs- en publicatieregels zijn al voorbereid; de betaalprovider is nog niet gekoppeld.</p>
          </div>
        ) : null}
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
                ? `${formatPrice(monthlyPrice)}/maand exclusief btw wordt toegevoegd aan je volgende factuur.`
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
