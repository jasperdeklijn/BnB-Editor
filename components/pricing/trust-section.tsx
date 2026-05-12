"use client"

import { Shield, Heart, Zap } from "lucide-react"

/**
 * Trust Section Component
 * Displays trust badges and guarantees
 */
export function TrustSection() {
  const trustItems = [
    {
      icon: Shield,
      label: "SSL Beveiligd",
      description: "Je gegevens zijn veilig",
    },
    {
      icon: Heart,
      label: "30-Dag Garantie",
      description: "Geld terug geen vragen",
    },
    {
      icon: Zap,
      label: "24/7 Support",
      description: "Altijd bereikbaar",
    },
  ]

  return (
    <section className="mt-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {trustItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="flex flex-col items-center text-center p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 hover:shadow-lg transition-shadow"
            >
              <Icon className="h-10 w-10 text-[var(--brand-blue)] mb-4" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                {item.label}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Vertrouwd door meer dan 500+ B&B eigenaren in Nederland
        </p>
      </div>
    </section>
  )
}
