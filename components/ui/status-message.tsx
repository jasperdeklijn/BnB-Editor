import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react"
import type React from "react"
import { cn } from "@/lib/utils"

type StatusMessageTone = "success" | "error" | "warning" | "info"

const toneClasses: Record<StatusMessageTone, string> = {
  success: "border-primary/20 bg-primary/10 text-primary",
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-secondary-foreground",
  info: "border-border bg-muted text-foreground",
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
}

export function StatusMessage({
  tone = "info",
  children,
  className,
}: {
  tone?: StatusMessageTone
  children: React.ReactNode
  className?: string
}) {
  const Icon = icons[tone]

  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", toneClasses[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  )
}
