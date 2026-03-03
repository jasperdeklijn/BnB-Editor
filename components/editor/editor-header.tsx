"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Save, Upload, Monitor, Tablet, Smartphone, ImageIcon, LogOut } from "lucide-react"
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
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">BnB Builder</h1>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-64"
          placeholder="Website title"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border p-1">
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
        <Button variant="outline" size="sm" asChild>
          <Link href="/images">
            <ImageIcon className="mr-2 h-4 w-4" />
            Images
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={onPreviewToggle}>
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
        <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" onClick={onPublish} disabled={isSaving}>
          <Upload className="mr-2 h-4 w-4" />
          Publish
        </Button>
        <div className="ml-2 h-6 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
