import { cn } from "@/lib/utils"
import styles from "./page-loading-indicator.module.css"

interface PageLoadingIndicatorProps {
  variant?: "page" | "content" | "workspace" | "section" | "compact"
  className?: string
  label?: string
  hideLabel?: boolean
}

export function PageLoadingIndicator({
  variant = "page",
  className,
  label = "Even laden…",
  hideLabel = false,
}: PageLoadingIndicatorProps) {
  return (
    <div
      className={cn(styles.loader, styles[variant], className)}
      role="status"
      aria-label="Pagina wordt geladen"
      aria-busy="true"
    >
      <span className={styles.spinner} aria-hidden="true" />
      <span className={cn(styles.label, hideLabel && "sr-only")}>{label}</span>
    </div>
  )
}

export function SectionLoadingIndicator() {
  return <PageLoadingIndicator variant="section" />
}
