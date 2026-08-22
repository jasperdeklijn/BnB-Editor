import type { ReactNode } from "react"

export function FormField({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      {children}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}

export const onboardingInputClass = "h-11 rounded-xl"
export const onboardingSelectClass = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

