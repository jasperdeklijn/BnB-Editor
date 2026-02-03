"use client"

import type React from "react"
import { useState } from "react"
import { ImageIcon, Home, Bed, Mail, Sparkles, Info, ChevronLeft, ChevronRight, Plus, Menu, Layout } from "lucide-react"
import type { SectionType } from "@/lib/types"

const sectionTypes: { type: SectionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "nav", label: "Navigation", icon: <Menu className="h-5 w-5" />, description: "Top navbar" },
  { type: "hero", label: "Hero", icon: <Home className="h-5 w-5" />, description: "Main header section" },
  { type: "about", label: "About", icon: <Info className="h-5 w-5" />, description: "Tell your story" },
  { type: "rooms", label: "Rooms", icon: <Bed className="h-5 w-5" />, description: "Showcase rooms" },
  { type: "gallery", label: "Gallery", icon: <ImageIcon className="h-5 w-5" />, description: "Photo gallery" },
  { type: "amenities", label: "Amenities", icon: <Sparkles className="h-5 w-5" />, description: "List features" },
  { type: "contact", label: "Contact", icon: <Mail className="h-5 w-5" />, description: "Contact form" },
  { type: "footer", label: "Footer", icon: <Layout className="h-5 w-5" />, description: "Bottom footer" },
]

interface SectionsSelectorProps {
  className?: string
}

export function SectionsSelector({ className = "" }: SectionsSelectorProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [draggingType, setDraggingType] = useState<SectionType | null>(null)

  const handleDragStart = (e: React.DragEvent, type: SectionType) => {
    e.dataTransfer.setData("sectionType", type)
    console.log("drag start - sectionType:", type)
    e.dataTransfer.effectAllowed = "copy"
    setDraggingType(type)
  }

  const handleDragEnd = () => {
    setDraggingType(null)
  }

  return (
    <aside
      className={`relative flex-shrink-0 transition-all duration-300 ease-in-out ${collapsed ? "w-16" : "w-64"} border-r bg-gradient-to-b from-background to-muted/20 p-4 ${className}`}
    >
      <button
        aria-label={collapsed ? "Expand sections" : "Collapse sections"}
        onClick={() => setCollapsed((s) => !s)}
        className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border bg-card p-0 text-sm shadow-sm transition-all hover:scale-110 hover:bg-accent"
        title={collapsed ? "Expand" : "Collapse"}
        type="button"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className={`mb-6 ${collapsed ? "opacity-0" : "opacity-100 transition-opacity delay-100"}`}>
        <h3 className={`${collapsed ? "sr-only" : "mb-1 text-sm font-semibold"}`}>
          Add Sections
        </h3>
        <p className={`${collapsed ? "sr-only" : "text-xs text-muted-foreground"}`}>
          Drag and drop to add
        </p>
      </div>

      <div className={`space-y-2 ${collapsed ? "mt-12 flex flex-col items-center" : ""}`}>
        {sectionTypes.map(({ type, label, icon, description }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onDragEnd={handleDragEnd}
            className={`group relative flex cursor-move items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-amber-400 active:scale-95 ${
              collapsed ? "justify-center px-2 py-3" : ""
            } ${draggingType === type ? "opacity-50 scale-95" : ""}`}
            title={collapsed ? `${label}: ${description}` : label}
          >
            <div className="flex-shrink-0 rounded-md bg-amber-50 p-2 text-amber-700 transition-colors group-hover:bg-amber-100">
              {icon}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{label}</span>
                  <Plus className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              </div>
            )}
            <div className={`absolute inset-0 rounded-lg bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 opacity-0 transition-opacity group-hover:opacity-100 ${collapsed ? "hidden" : ""}`} />
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="mt-6 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-center animate-in fade-in slide-in-from-left-2 duration-300">
          <p className="text-xs text-muted-foreground">
            Drag sections to the canvas to build your site
          </p>
        </div>
      )}
    </aside>
  )
}
