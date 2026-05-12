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
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    trial: {
      icon: <Clock className="h-4 w-4" />,
      label: "Gratis proefperiode",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    past_due: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Betaling vereist",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    canceled: {
      icon: <X className="h-4 w-4" />,
      label: "Geannuleerd",
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-900/30",
    },
    expired: {
      icon: <X className="h-4 w-4" />,
      label: "Verlopen",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
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
