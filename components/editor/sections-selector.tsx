"use client"

import type React from "react"
import { useState } from "react"
import { ImageIcon, Home, Bed, Mail, Sparkles, Info, ChevronLeft, ChevronRight } from "lucide-react"
import type { SectionType } from "@/lib/types"

const sectionTypes: { type: SectionType; label: string; icon: React.ReactNode }[] = [
  { type: "hero", label: "Hero", icon: <Home className="h-5 w-5" /> },
  { type: "about", label: "About", icon: <Info className="h-5 w-5" /> },
  { type: "rooms", label: "Rooms", icon: <Bed className="h-5 w-5" /> },
  { type: "gallery", label: "Gallery", icon: <ImageIcon className="h-5 w-5" /> },
  { type: "amenities", label: "Amenities", icon: <Sparkles className="h-5 w-5" /> },
  { type: "contact", label: "Contact", icon: <Mail className="h-5 w-5" /> },
]

interface SectionsSelectorProps {
  className?: string
}

export function SectionsSelector({ className = "" }: SectionsSelectorProps) {
  const [collapsed, setCollapsed] = useState(false)

  const handleDragStart = (e: React.DragEvent, type: SectionType) => {
    e.dataTransfer.setData("sectionType", type)
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <aside
      className={`relative flex-shrink-0 ${collapsed ? "w-16" : "w-64"} border-r bg-background p-4 ${className}`}
    >
      <button
        aria-label={collapsed ? "Expand sections" : "Collapse sections"}
        onClick={() => setCollapsed((s) => !s)}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border bg-card p-0 text-sm shadow-sm hover:bg-accent"
        title={collapsed ? "Expand" : "Collapse"}
        type="button"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <h3 className={`${collapsed ? "sr-only" : "mb-4 text-sm font-semibold text-muted-foreground"}`}>
        Sections
      </h3>

      <div className={`space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {sectionTypes.map(({ type, label, icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className={`flex cursor-move items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:text-accent-foreground ${
              collapsed ? "justify-center px-1" : ""
            }`}
            title={label}
          >
            {icon}
            <span className={`${collapsed ? "sr-only" : "text-sm font-medium"}`}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
