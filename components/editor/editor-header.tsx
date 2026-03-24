"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Eye,
  EyeOff,
  Save,
  Upload,
  Monitor,
  Tablet,
  Smartphone,
  ImageIcon,
  LogOut,
  MoreVertical,
} from "lucide-react"
import Link from "next/link"

interface EditorHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  isPreview: boolean
  onPreviewToggle: () => void
  onSave: () => void
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
  onSave,
  onPublish,
  onLogout,
  isSaving,
  device,
  onDeviceChange,
}: EditorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
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
    <header className="flex items-center justify-between border-b border-border bg-background px-3 py-2 md:px-6 md:py-3 gap-2">
      {/* Left: branding + title */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <h1 className="hidden sm:block text-base md:text-lg font-semibold text-foreground shrink-0">
          BnB Builder
        </h1>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-32 sm:w-48 md:w-64 text-sm"
          placeholder="Website title"
        />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* Device toggles — hidden on mobile, visible md+ */}
        <div className="hidden md:flex items-center gap-1 rounded-md border border-border p-1">
          <Button
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onDeviceChange("desktop")}
            className="h-8 px-2"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={device === "tablet" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onDeviceChange("tablet")}
            className="h-8 px-2"
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onDeviceChange("mobile")}
            className="h-8 px-2"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        {/* Images link — hidden on small mobile */}
        <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/images">
            <ImageIcon className="mr-2 h-4 w-4" />
            Images
          </Link>
        </Button>

        {/* Preview toggle — text+icon on sm+, icon-only on xs */}
        <Button variant="outline" size="sm" onClick={onPreviewToggle} className="hidden sm:inline-flex">
          {isPreview ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Edit
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </>
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={onPreviewToggle} className="sm:hidden h-8 w-8">
          {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>

        {/* Save */}
        <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="hidden sm:inline-flex">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" size="icon" onClick={onSave} disabled={isSaving} className="sm:hidden h-8 w-8">
          <Save className="h-4 w-4" />
        </Button>

        {/* Publish */}
        <Button size="sm" onClick={onPublish} disabled={isSaving} className="hidden sm:inline-flex">
          <Upload className="mr-2 h-4 w-4" />
          Publish
        </Button>
        <Button size="icon" onClick={onPublish} disabled={isSaving} className="sm:hidden h-8 w-8">
          <Upload className="h-4 w-4" />
        </Button>

        {/* Overflow menu (custom, no external dependency) */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-52 rounded-md border border-border bg-background shadow-md"
            >
              {/* Device picker — mobile only */}
              <div className="md:hidden px-3 py-2 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Preview device</p>
                <div className="flex gap-1">
                  <Button
                    variant={device === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => { onDeviceChange("desktop"); setMenuOpen(false) }}
                    className="h-7 flex-1 px-1"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={device === "tablet" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => { onDeviceChange("tablet"); setMenuOpen(false) }}
                    className="h-7 flex-1 px-1"
                  >
                    <Tablet className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={device === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => { onDeviceChange("mobile"); setMenuOpen(false) }}
                    className="h-7 flex-1 px-1"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Images link — mobile only (sm+ shows the button) */}
              <div className="sm:hidden border-b border-border">
                <Link
                  href="/images"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <ImageIcon className="h-4 w-4" />
                  Images
                </Link>
              </div>

              {/* Logout — always visible */}
              <button
                role="menuitem"
                onClick={() => { onLogout(); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
