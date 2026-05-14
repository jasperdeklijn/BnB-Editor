"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  Eye,
  EyeOff,
  Upload,
  Monitor,
  Tablet,
  Smartphone,
  ImageIcon,
  Globe,
  Home,
  BedDouble,
  CheckCircle2,
  Loader2,
  ChevronDown,
  CreditCard,
  User,
} from "lucide-react"
import Link from "next/link"

interface EditorHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  isPreview: boolean
  onPreviewToggle: () => void
  onPublish: () => void
  onLogout: () => void
  isSaving: boolean
  device: "desktop" | "tablet" | "mobile"
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void
}

export function EditorHeader({
  title,
  onTitleChange,
  isPreview,
  onPreviewToggle,
  onPublish,
  onLogout,
  isSaving,
  device,
  onDeviceChange,
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
    <header className="flex items-center justify-between border-b border-[var(--editor-header-accent)] bg-[var(--editor-header)] px-3 py-2 md:px-6 md:py-3 gap-2 shrink-0 z-60">
      {/* Left: branding + title */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
         <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="BnB Website Maken"
                width={160}
                height={48}
                className="h-12 w-auto"
              />
          </div>
         {/* Mijn BnB pulldown */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-md bg-purple-600 text-white hover:bg-purple-700"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Home className="mr-2 h-4 w-4" />
            Mijn BnB
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-card shadow-lg"
            >
              {/* Images link */}
              <Link
                href="/editor/images"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                Afbeeldingen
              </Link>

              {/* BnB Details link */}
              <Link
                href="/bnb"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <Home className="h-4 w-4 text-primary" />
                B&B Details
              </Link>

              {/* Rooms link */}
              <Link
                href="/rooms"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <BedDouble className="h-4 w-4 text-primary" />
                Kamers
              </Link>

              {/* Domains link */}
              <Link
                href="/domains"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
                Domeininstellingen
              </Link>
            </div>
          )}
        </div>

        {/* Account pulldown */}
        <div className="relative" ref={accountMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-md text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
            onClick={() => setAccountMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
          >
            <User className="mr-2 h-4 w-4" />
            Account
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>

          {accountMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-card shadow-lg"
            >
              {/* Billing link */}
              <Link
                href="/account/billing"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <CreditCard className="h-4 w-4 text-primary" />
                Billing
              </Link>

              {/* Profile link */}
              <Link
                href="/account/profile"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4 text-primary" />
                Profile
              </Link>
            </div>
          )}
        </div>
        {/* Auto-save indicator */}
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--editor-header-fg)]/70">
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Opslaan…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              Opgeslagen
            </>
          )}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* Device toggles — hidden on mobile */}
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


        {/* Preview toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviewToggle}
          className="hidden sm:inline-flex text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)] border border-[var(--editor-header-accent)]"
        >
          {isPreview ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Bewerken
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Voorbeeld
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreviewToggle}
          className="sm:hidden h-8 w-8 text-[var(--editor-header-fg)] hover:bg-[var(--editor-header-fg)]/10"
        >
          {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>

        {/* Publish */}
        <Button
          size="sm"
          onClick={onPublish}
          disabled={isSaving}
          className="hidden sm:inline-flex bg-[var(--editor-header-fg)] text-[var(--editor-header)] hover:bg-[var(--editor-header-fg)]/90"
        >
          <Upload className="mr-2 h-4 w-4" />
          Publiceren
        </Button>
        <Button
          size="icon"
          onClick={onPublish}
          disabled={isSaving}
          className="sm:hidden h-8 w-8 bg-[var(--editor-header-fg)] text-[var(--editor-header)] hover:bg-[var(--editor-header-fg)]/90"
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
