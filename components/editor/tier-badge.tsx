import type { PlanId } from "@/lib/types/pricing"
import { getPlanDisplayName } from "@/lib/pricing"
import { cn } from "@/lib/utils"

interface TierBadgeProps {
  plan: PlanId
  className?: string
  prefix?: string
}

export function TierBadge({ plan, className, prefix }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800",
        className,
      )}
      aria-label={`${prefix ? `${prefix}: ` : ""}${getPlanDisplayName(plan)} abonnement`}
    >
      {prefix ? `${prefix}: ` : ""}{getPlanDisplayName(plan)}
    </span>
  )
}
