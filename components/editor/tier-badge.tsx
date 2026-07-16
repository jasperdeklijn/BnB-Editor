import type { PlanId } from "@/lib/types/pricing"
import { getPlanDisplayName } from "@/lib/pricing"
import { cn } from "@/lib/utils"

interface TierBadgeProps {
  plan: PlanId
  className?: string
  prefix?: string
}

export function TierBadge({ plan, className, prefix }: TierBadgeProps) {
  const planClasses: Record<PlanId, string> = {
    bronze: "border-orange-700/30 bg-orange-700/10 text-orange-900",
    silver: "border-slate-400/60 bg-slate-100 text-slate-700",
    gold: "border-amber-500/50 bg-amber-100 text-amber-900",
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        planClasses[plan],
        className,
      )}
      aria-label={`${prefix ? `${prefix}: ` : ""}${getPlanDisplayName(plan)} abonnement`}
    >
      {prefix ? `${prefix}: ` : ""}{getPlanDisplayName(plan)}
    </span>
  )
}
