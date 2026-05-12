"use client"

import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FeatureListProps {
  features: string[]
  className?: string
}

/**
 * Feature List Component
 * Displays a list of features with checkmark icons
 */
export function FeatureList({ features, className }: FeatureListProps) {
  return (
    <ul className={cn("space-y-3", className)}>
      {features.map((feature, index) => (
        <li key={`feature-${index}`} className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {feature}
          </span>
        </li>
      ))}
    </ul>
  )
}
