"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { ArrowLeft, Monitor, Tablet, Smartphone, CheckCircle2, AlertCircle, Loader2, ChevronDown, CreditCard, User, Plus } from "lucide-react"
import Link from "next/link"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"
import { EDITOR_NAVIGATION, getEditorGroup } from "@/lib/editor-navigation"
import { cn } from "@/lib/utils"

interface EditorHeaderProps {
  isPreview: boolean
  onPreviewToggle: () => void
  onPublish: () => void
  onLogout: () => void
  isSaving: boolean
  saveState?: "saved" | "saving" | "error"
  device: "desktop" | "tablet" | "mobile"
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void
  avatarUrl?: string | null
  displayName?: string | null
  pageTitle?: string
  titleIcon?: React.ReactNode
  infoText?: string
  actionLabel?: string
  actionIcon?: React.ReactNode
  onAction?: () => void
  actionLoading?: boolean
  showEditorActions?: boolean
  offeringLabel?: string
  calendarLabel?: string
  pathname: string | null
}

export function EditorHeader({ onLogout, isSaving, saveState = isSaving ? "saving" : "saved", device, onDeviceChange, avatarUrl, displayName, infoText, actionLabel, actionIcon, onAction, actionLoading = false, showEditorActions = true, pathname }: EditorHeaderProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const activeGroup = getEditorGroup(pathname)
  const deviceLabels = { desktop: "Desktop preview", tablet: "Tablet preview", mobile: "Telefoon preview" }

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) setAccountMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountMenuOpen) {
        setAccountMenuOpen(false)
        accountMenuRef.current?.querySelector("button")?.focus()
      }
    }
    document.addEventListener("mousedown", closeOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [accountMenuOpen])

  return (
    <header className="relative z-60 flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--editor-header-accent)] bg-[var(--editor-header)] px-3 py-2 md:px-6">
      <Link href="/editor" aria-label="Website-editor" className="order-1 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white">
        <Image src="/icon.png" alt={PLATFORM_BRAND_NAME} width={1024} height={1024} className="h-8 w-8 lg:hidden" />
        <Image src="/logo_klein.png" alt={PLATFORM_BRAND_NAME} width={1536} height={1024} className="hidden h-10 w-auto object-contain lg:block" />
      </Link>
      <nav aria-label="Hoofdnavigatie" className="order-3 grid w-full grid-cols-2 gap-1 min-[380px]:grid-cols-4 lg:order-2 lg:flex lg:w-auto lg:flex-1 lg:justify-center">
        {EDITOR_NAVIGATION.map((group) => (
          <Link key={group.id} href={group.href} aria-current={activeGroup?.id === group.id ? "true" : undefined}
            className={cn("inline-flex min-h-11 items-center justify-center rounded-md px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white sm:px-3 sm:text-sm",
              activeGroup?.id === group.id ? "bg-white text-primary shadow-sm" : "text-[var(--editor-header-fg)] hover:bg-[var(--editor-header-accent)]/25")}>
            {group.label}
          </Link>
        ))}
      </nav>
      <div className="order-2 ml-auto flex items-center gap-2 lg:order-3">
        {infoText ? <span className="hidden 2xl:inline text-xs text-[var(--editor-header-fg)]/70">{infoText}</span> : null}
        {showEditorActions ? <span role="status" className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--editor-header-fg)]/70">
          {saveState === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Opslaan…</> : saveState === "error" ? <><AlertCircle className="h-3.5 w-3.5 text-warning" />Niet opgeslagen</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />Opgeslagen</>}
        </span> : null}
      {/* Right: actions */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* Device toggles — hidden on mobile */}
        {showEditorActions ? (
          <div className="hidden md:flex items-center gap-1 rounded-md border border-[var(--editor-header-accent)] p-1">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                onClick={() => onDeviceChange(d)}
                aria-label={deviceLabels[d]}
                aria-pressed={device === d}
                title={deviceLabels[d]}
                className={`h-8 px-2 transition-colors ${
                  device === d
                    ? "bg-[var(--editor-header-fg)]/15 text-[var(--editor-header-fg)]"
                    : "text-[var(--editor-header-fg)]/60 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
                }`}
              >
                {d === "desktop" && <Monitor className="h-4 w-4" />}
                {d === "tablet" && <Tablet className="h-4 w-4" />}
                {d === "mobile" && <Smartphone className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        ) : null}
        {onAction && actionLabel ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            disabled={actionLoading}
            aria-label={actionLabel}
            title={actionLabel}
            className="h-11 min-w-11 rounded-md px-2 text-xs md:h-10 md:min-w-0 md:px-3 md:text-sm"
          >
            {actionIcon ? <span className="flex-shrink-0 hidden md:block">{actionIcon}</span> : null}
            <span className="hidden md:inline">{actionLabel}</span>
            <span className="md:hidden flex-shrink-0">{actionIcon || <Plus className="h-3.5 w-3.5" />}</span>
          </Button>
        ) : null}
        <div className="relative" ref={accountMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 min-w-11 rounded-full px-3 text-[var(--editor-header-fg)]/85 hover:bg-[var(--editor-header-accent)]/25 hover:text-white md:h-10 md:min-w-0 md:px-3"
            onClick={() => setAccountMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            aria-label="Account menu openen"
            title="Account menu"
          >
            {avatarUrl ? (
              <span className="inline-flex h-6 w-6 md:h-8 md:w-8 overflow-hidden rounded-full bg-muted flex-shrink-0">
                <Image
                  src={avatarUrl}
                  alt="Profile avatar"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
              <User className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            )}
            <span className="hidden md:inline ml-2 text-xs md:text-sm">{displayName ? displayName : "Account"}</span>
            <ChevronDown className="hidden md:inline h-3.5 w-3.5 md:h-4 md:w-4 ml-1" />
          </Button>

          {accountMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-white shadow-lg text-sm"
            >
              <Link
                href="/editor/account/profile"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Profiel
              </Link>
              <Link
                href="/editor/account/billing"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Facturering
              </Link>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false)
                  onLogout()
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  )
}
