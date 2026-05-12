"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { PricingPlan, PlanId } from "@/lib/types/pricing"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  plan: PricingPlan
  isPopular?: boolean
  isSelected?: boolean
  onSelectPlan?: (planId: PlanId) => void
}

/**
 * Pricing Card Component
 * Displays a single pricing plan with features and CTA button
 */
export function PricingCard({
  plan,
  isPopular = false,
  isSelected = false,
  onSelectPlan,
}: PricingCardProps) {
  const handleClick = () => {
    if (onSelectPlan) {
      onSelectPlan(plan.id)
    }
  }

  return (
    <div
      className={cn(
        "relative group flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden",
        isPopular
          ? "border-[var(--brand-blue)]/50 bg-gradient-to-br from-[var(--brand-blue)]/10 to-[var(--brand-purple)]/5 shadow-xl shadow-[var(--brand-blue)]/10 ring-1 ring-[var(--brand-blue)]/20 scale-105 lg:scale-110"
          : "border-slate-200/30 bg-white/5 hover:bg-white/10 hover:border-slate-200/50",
        isSelected && !isPopular && "ring-2 ring-blue-500"
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white text-xs font-bold py-2 text-center">
          MEEST GEKOZEN
        </div>
      )}

      {/* Content container */}
      <div className="p-8 pt-10 lg:p-10 flex flex-col h-full">
        {/* Plan header */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {plan.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              €{plan.monthlyPrice}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              /maand
            </span>
          </div>
          {plan.isAddon && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Voeg toe aan elk plan
            </p>
          )}
        </div>

        {/* Features list */}
        <div className="mb-8 flex-1">
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li
                key={`${plan.id}-feature-${index}`}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleClick}
          className={cn(
            "w-full transition-all duration-300 gap-2 group/btn",
            isPopular
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
              : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
          )}
        >
          {plan.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Button>

        {/* Billing info */}
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center">
          Maandelijks gefactureerd • Upgraden of downgraden wanneer je wilt
        </p>
      </div>

      {/* Glow effect for popular card */}
      {isPopular && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(245, 158, 11, 0.1), transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
