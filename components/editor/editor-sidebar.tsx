"use client"

import type React from "react"

import type { SectionType } from "@/lib/types"
import { ImageIcon, Home, Bed, Mail, Sparkles, Info } from "lucide-react"

const sectionTypes: { type: SectionType; label: string; icon: React.ReactNode }[] = [
  { type: "hero", label: "Hero Section", icon: <Home className="h-5 w-5" /> },
  { type: "about", label: "About", icon: <Info className="h-5 w-5" /> },
  { type: "rooms", label: "Rooms", icon: <Bed className="h-5 w-5" /> },
  { type: "gallery", label: "Gallery", icon: <ImageIcon className="h-5 w-5" /> },
  { type: "amenities", label: "Amenities", icon: <Sparkles className="h-5 w-5" /> },
  { type: "contact", label: "Contact", icon: <Mail className="h-5 w-5" /> },
]

export function EditorSidebar() {
  const handleDragStart = (e: React.DragEvent, type: SectionType) => {
    e.dataTransfer.setData("sectionType", type)
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <aside className="w-64 border-r bg-background p-4">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">SECTIONS</h2>
      <div className="space-y-2">
        {sectionTypes.map(({ type, label, icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="flex cursor-move items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
