"use client"

import { useState } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
        {/* Device toggles — hidden on small mobile, visible md+ */}
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

        {/* Preview toggle */}
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
        {/* Mobile-only icon-only preview toggle */}
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

        {/* Overflow menu — shown on all sizes for secondary actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Mobile-only: device toggle section */}
            <div className="md:hidden px-2 py-1.5">
              <p className="text-xs text-muted-foreground mb-1.5">Preview device</p>
              <div className="flex gap-1">
                <Button
                  variant={device === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onDeviceChange("desktop")}
                  className="h-7 flex-1 px-1"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={device === "tablet" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onDeviceChange("tablet")}
                  className="h-7 flex-1 px-1"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={device === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onDeviceChange("mobile")}
                  className="h-7 flex-1 px-1"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator className="md:hidden" />

            {/* Images link (mobile-only since sm+ shows the button) */}
            <DropdownMenuItem asChild className="sm:hidden">
              <Link href="/images" className="flex items-center gap-2 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                Images
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="sm:hidden" />

            <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
