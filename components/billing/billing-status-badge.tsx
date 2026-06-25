"use client"

import { SubscriptionStatus } from "@/lib/types/pricing"
import { CheckCircle2, AlertCircle, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BillingStatusBadgeProps {
  status: SubscriptionStatus
  className?: string
}

/**
 * Billing Status Badge Component
 * Displays subscription status with appropriate icon and color
 */
export function BillingStatusBadge({
  status,
  className,
}: BillingStatusBadgeProps) {
  const statusConfig: Record<
    SubscriptionStatus,
    { icon: React.ReactNode; label: string; color: string; bgColor: string }
  > = {
    active: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Actief",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    trial: {
      icon: <Clock className="h-4 w-4" />,
      label: "Gratis proefperiode",
      color: "text-primary",
      bgColor: "bg-secondary",
    },
    past_due: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Betaling vereist",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    canceled: {
      icon: <X className="h-4 w-4" />,
      label: "Geannuleerd",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    expired: {
      icon: <X className="h-4 w-4" />,
      label: "Verlopen",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  }

  const config = statusConfig[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  )
}
