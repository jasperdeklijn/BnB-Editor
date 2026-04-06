"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Eye,
  EyeOff,
  Upload,
  Monitor,
  Tablet,
  Smartphone,
  ImageIcon,
  LogOut,
  MoreVertical,
  Globe,
  User,
  Home,
  BedDouble,
  CheckCircle2,
  Loader2,
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-[var(--editor-header-accent)] bg-[var(--editor-header)] px-3 py-2 md:px-6 md:py-3 gap-2 shrink-0">
      {/* Left: branding + title */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <span className="hidden sm:block text-base md:text-lg font-semibold text-[var(--editor-header-fg)] shrink-0">
          BnB Bouwer
        </span>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-32 sm:w-48 md:w-64 text-sm bg-[var(--editor-header-accent)]/40 border-[var(--editor-header-accent)] text-[var(--editor-header-fg)] placeholder:text-[var(--editor-header-fg)]/50 focus-visible:ring-[var(--editor-header-fg)]/30"
          placeholder="Website titel"
        />
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

        {/* Images link */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="hidden sm:inline-flex text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)] border border-[var(--editor-header-accent)]"
        >
          <Link href="/images">
            <ImageIcon className="mr-2 h-4 w-4" />
            Afbeeldingen
          </Link>
        </Button>

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
              Voorvertoning
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

        {/* Overflow menu */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Meer opties</span>
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-card shadow-lg"
            >
              {/* Device picker — mobile screens only */}
              <div className="md:hidden px-3 py-2 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Voorvertoningsapparaat</p>
                <div className="flex gap-1">
                  {(["desktop", "tablet", "mobile"] as const).map((d) => (
                    <Button
                      key={d}
                      variant={device === d ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => { onDeviceChange(d); setMenuOpen(false) }}
                      className="h-7 flex-1 px-1"
                    >
                      {d === "desktop" && <Monitor className="h-3.5 w-3.5" />}
                      {d === "tablet" && <Tablet className="h-3.5 w-3.5" />}
                      {d === "mobile" && <Smartphone className="h-3.5 w-3.5" />}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Images link */}
              <Link
                href="/images"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
                Afbeeldingen
              </Link>

              {/* Profile link */}
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <User className="h-4 w-4 text-primary" />
                Mijn Profiel
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
                Domeininstellingen
              </Link>

              {/* Logout */}
              <button
                role="menuitem"
                type="button"
                onClick={() => { onLogout(); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
