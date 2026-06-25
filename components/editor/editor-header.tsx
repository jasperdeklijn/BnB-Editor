"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Upload,
  Monitor,
  Tablet,
  Smartphone,
  ImageIcon,
  Globe,
  Home,
  Briefcase,
  LayoutTemplate,
  Palette,
  CheckCircle2,
  Loader2,
  ChevronDown,
  CreditCard,
  User,
  Plus,
} from "lucide-react"
import Link from "next/link"

interface EditorHeaderProps {
  isPreview: boolean
  onPreviewToggle: () => void
  onPublish: () => void
  onLogout: () => void
  isSaving: boolean
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
  showBackButton?: boolean
}

export function EditorHeader({
  isPreview,
  onPreviewToggle,
  onPublish,
  onLogout,
  isSaving,
  device,
  onDeviceChange,
  avatarUrl,
  displayName,
  pageTitle,
  titleIcon,
  infoText,
  actionLabel,
  actionIcon,
  onAction,
  actionLoading = false,
  showEditorActions = true,
  showBackButton = false,
}: EditorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="relative flex items-center justify-between border-b border-[var(--editor-header-accent)] bg-[var(--editor-header)] px-2 py-2 md:px-6 md:py-3 gap-1 md:gap-2 shrink-0 z-60">
      <div className="flex items-center gap-1 md:gap-4 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1 md:gap-2">
          
       
        </div>
        {showBackButton ? (
          <div className="flex items-center gap-1 md:gap-2">
          <Image
            src="/favicon.png"
            alt="Website maker"
            width={32}
            height={32}
            className="h-7 w-7 md:h-8 md:w-8"
          />
          <Link
            href="/editor"
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-[var(--editor-header-accent)] bg-[var(--editor-header)] px-3 py-2 text-xs md:text-sm font-medium text-[var(--editor-header-fg)] transition-colors hover:bg-[var(--editor-header-accent)]/25"
          >
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Terug naar editor</span>
          </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Image
              src="/favicon.png"
              alt="Website maker"
              width={32}
              height={32}
              className="h-7 w-7 md:hidden"
            />
            <Image
              src="/logo_klein.png"
              alt="Website maker"
              width={160}
              height={32}
              className="hidden md:block h-10 md:h-12 w-auto"
            />
          </div>
        )}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full bg-white text-primary hover:bg-secondary px-2 md:px-3 text-xs md:text-sm shadow-sm"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline ml-1.5">Mijn website</span>
            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 ml-1" />
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] max-w-[calc(100vw-1rem)] md:w-56 rounded-xl border border-border bg-white shadow-lg text-sm"
            >
              <Link
                href="/editor"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <LayoutTemplate className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Website bewerken
              </Link>

              {/* Images link */}
              <Link
                href="/editor/images"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <ImageIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Afbeeldingen
              </Link>

              {/* Business details link */}
              <Link
                href="/editor/business"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <Home className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Bedrijfsgegevens
              </Link>

              {/* Templates link */}
              <Link
                href="/editor/templates"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <LayoutTemplate className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Sjablonen
              </Link>

              {/* Themes link */}
              <Link
                href="/editor/themes"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <Palette className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Thema
              </Link>

              {/* Services link */}
              <Link
                href="/editor/services"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors border-b border-border"
              >
                <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Diensten
              </Link>

              {/* Domains link */}
              <Link
                href="/editor/domains"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
              >
                <Globe className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                Domeininstellingen
              </Link>
            </div>
          )}
        </div>

      </div>

      <div className="flex-1 px-1 md:px-2 text-center flex justify-center gap-1 md:gap-4 min-w-0">
        {pageTitle ? (
          <h1 className="inline-flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm font-semibold text-[var(--editor-header-fg)] truncate">
            {titleIcon ? <span className="flex-shrink-0 text-lg">{titleIcon}</span> : null}
            <span className="truncate">{pageTitle}</span>
          </h1>
        ) : null}
        {infoText ? (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[var(--editor-header-fg)]/70 whitespace-nowrap">
            {infoText}
          </span>
        ) : null}
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--editor-header-fg)]/70 flex-shrink-0">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 md:h-3.5 md:w-3.5 animate-spin" />
              <span className="hidden md:inline">Opslaan…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-300" />
              <span className="hidden md:inline">Opgeslagen</span>
            </>
          )}
        </span>
      </div>

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
            className="h-8 md:h-10 rounded-md px-2 md:px-3 text-xs md:text-sm"
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
            className="h-8 md:h-10 rounded-full text-[var(--editor-header-fg)]/85 hover:bg-[var(--editor-header-accent)]/25 hover:text-white px-2 md:px-3"
            onClick={() => setAccountMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
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
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
