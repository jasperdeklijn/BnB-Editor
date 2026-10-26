import { cn } from "@/lib/utils"

export function PricePreview({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <span aria-hidden="true" className="pointer-events-none select-none whitespace-nowrap blur-[6px]">€ —,—</span>
      <span className="text-xs font-medium text-[var(--landing-muted)]">Binnenkort bekend</span>
    </span>
  )
}
