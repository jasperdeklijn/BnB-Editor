"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import type { Section, SectionStyles } from "@/lib/types"
import { Palette, Type, ImageIcon } from "lucide-react"

interface StyleSidebarProps {
  selectedSection: Section | null
  onStyleUpdate: (styles: SectionStyles) => void
}

const FONT_OPTIONS = [
  { value: "font-sans", label: "Sans Serif (Default)" },
  { value: "font-serif", label: "Serif" },
  { value: "font-mono", label: "Monospace" },
]

export function StyleSidebar({ selectedSection, onStyleUpdate }: StyleSidebarProps) {
  if (!selectedSection) {
    return (
      <div className="w-80 border-l bg-background p-6">
        <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
          Click on a section in the canvas to customize its appearance
        </div>
      </div>
    )
  }

  const styles = selectedSection.styles || {}

  const handleFontChange = (value: string) => {
    onStyleUpdate({ ...styles, fontFamily: value })
  }

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleUpdate({ ...styles, textColor: e.target.value })
  }

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleUpdate({ ...styles, backgroundColor: e.target.value })
  }

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleUpdate({ ...styles, backgroundImage: e.target.value })
  }

  return (
    <div className="w-80 border-l bg-background p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Customize Section</h2>
        <p className="text-sm text-muted-foreground">
          {selectedSection.type.charAt(0).toUpperCase() + selectedSection.type.slice(1)} Section
        </p>
      </div>

      <div className="space-y-6">
        {/* Font Family */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Font Family</Label>
          </div>
          <Select value={styles.fontFamily || "font-sans"} onValueChange={handleFontChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Text Color */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Text Color</Label>
          </div>
          <div className="flex gap-2">
            <Input
              type="color"
              value={styles.textColor || "#000000"}
              onChange={handleTextColorChange}
              className="h-10 w-20 cursor-pointer"
            />
            <Input
              type="text"
              value={styles.textColor || ""}
              onChange={handleTextColorChange}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </Card>

        {/* Background Color */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Background Color</Label>
          </div>
          <div className="flex gap-2">
            <Input
              type="color"
              value={styles.backgroundColor || "#ffffff"}
              onChange={handleBackgroundColorChange}
              className="h-10 w-20 cursor-pointer"
            />
            <Input
              type="text"
              value={styles.backgroundColor || ""}
              onChange={handleBackgroundColorChange}
              placeholder="#ffffff"
              className="flex-1"
            />
          </div>
        </Card>

        {/* Background Image */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Background Image</Label>
          </div>
          <Input
            type="text"
            value={styles.backgroundImage || ""}
            onChange={handleBackgroundImageChange}
            placeholder="Enter image URL"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Use /placeholder.svg?height=600&width=1200 or any image URL
          </p>
        </Card>
      </div>
    </div>
  )
}
