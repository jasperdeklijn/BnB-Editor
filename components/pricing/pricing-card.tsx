"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import type { PlanId, PricingPlan } from "@/lib/types/pricing"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/pricing"
import Link from "next/link"

interface PricingCardProps {
  plan: PricingPlan
  isPopular?: boolean
  isSelected?: boolean
  onSelectPlan?: (planId: PlanId) => void
}

export function PricingCard({
  plan,
  isPopular = false,
  isSelected = false,
  onSelectPlan,
}: PricingCardProps) {
  const handleClick = () => {
    onSelectPlan?.(plan.id)
  }
  const planAccent = {
    bronze: "before:bg-[#a96f44]",
    silver: "before:bg-[var(--landing-accent)]",
    gold: "before:bg-[var(--landing-gold)]",
  }[plan.id]

  const buttonClasses = cn(
    "group/btn w-full gap-2 rounded-full transition-all duration-300",
    isPopular
      ? "bg-[var(--landing-primary)] text-white shadow-[0_10px_24px_rgba(36,56,45,0.18)] hover:bg-[var(--landing-primary-dark)]"
      : "bg-[var(--landing-secondary)] text-white hover:bg-[var(--landing-primary-dark)]"
  )

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1",
        planAccent,
        isPopular
          ? "border-[var(--landing-primary)] bg-[var(--landing-primary-light)] shadow-[0_20px_48px_rgba(31,41,51,0.09)] ring-1 ring-[var(--landing-primary)]/15 lg:scale-[1.03]"
          : "border-[var(--landing-border)] bg-white shadow-[0_16px_40px_rgba(31,41,51,0.06)] hover:border-[var(--landing-primary)]",
        isSelected && !isPopular && "ring-2 ring-[var(--landing-primary)]"
      )}
    >
      {isPopular && (
        <div className="absolute left-0 right-0 top-0 bg-[var(--landing-primary)] py-2 text-center text-xs font-bold text-white">
          MEEST GEKOZEN
        </div>
      )}

      <div className="flex h-full flex-col p-8 pt-10 lg:p-10">
        <div className="mb-6">
          <h3 className="mb-2 text-2xl font-bold text-[var(--landing-secondary)]">
            {plan.name}
          </h3>
          <p className="text-sm text-[var(--landing-muted)]">
            {plan.description}
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-[var(--landing-secondary)]">
              {formatPrice(plan.monthlyPrice)}
            </span>
            <span className="text-sm text-[var(--landing-muted)]">/maand</span>
          </div>
        </div>

        <div className="mb-8 flex-1">
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={`${plan.id}-feature-${index}`} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--landing-primary)]" />
                <span className="text-sm text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {onSelectPlan ? (
          <Button onClick={handleClick} className={buttonClasses}>
            {plan.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        ) : (
          <Button asChild className={buttonClasses}>
            <Link href={`/auth/sign-up?plan=${plan.id}`}>
              {plan.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        )}

        <p className="mt-4 text-center text-xs text-[var(--landing-muted)]">
          Maandelijks gefactureerd. Upgraden of downgraden wanneer je wilt.
        </p>
      </div>
    </div>
  )
}
