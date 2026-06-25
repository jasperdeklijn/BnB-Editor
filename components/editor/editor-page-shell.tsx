import type React from "react"
import { cn } from "@/lib/utils"

const maxWidthClasses = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
}

interface EditorPageShellProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  maxWidth?: keyof typeof maxWidthClasses
  className?: string
  contentClassName?: string
  scroll?: boolean
}

export function EditorPageShell({
  title,
  description,
  actions,
  children,
  maxWidth = "6xl",
  className,
  contentClassName,
  scroll = true,
}: EditorPageShellProps) {
  return (
    <div className={cn("h-full bg-muted", scroll ? "overflow-auto" : "overflow-hidden", className)}>
      <main
        className={cn(
          "mx-auto flex min-h-full w-full min-w-0 flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-8 md:px-8",
          maxWidthClasses[maxWidth],
          contentClassName,
        )}
      >
        <header className="flex min-w-0 flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  )
}
