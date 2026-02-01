"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ImageIcon, Home, Bed, Mail, Sparkles, Info, ChevronLeft, ChevronRight, Plus, Menu, Layout, AlignCenter, LayoutPanelLeft, Maximize, X } from "lucide-react"
import type { SectionType } from "@/lib/types"
import type { HeroLayout } from "@/components/bnb-sections/hero-section"

// Hero layout options
const heroLayouts: { layout: HeroLayout; label: string; icon: React.ReactNode; description: string }[] = [
  { layout: "centered", label: "Centered", icon: <AlignCenter className="h-4 w-4" />, description: "Text centered with background" },
  { layout: "split", label: "Split", icon: <LayoutPanelLeft className="h-4 w-4" />, description: "Image left, text right" },
  { layout: "fullwidth", label: "Full Width", icon: <Maximize className="h-4 w-4" />, description: "Full image with overlay" },
]

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
  const [showHeroLayouts, setShowHeroLayouts] = useState(false)
  const [heroPopupPosition, setHeroPopupPosition] = useState<{ top: number } | null>(null)
  const heroItemRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showHeroLayouts &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        heroItemRef.current &&
        !heroItemRef.current.contains(e.target as Node)
      ) {
        setShowHeroLayouts(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showHeroLayouts])

  const handleDragStart = (e: React.DragEvent, type: SectionType, layout?: HeroLayout) => {
    e.dataTransfer.setData("sectionType", type)
    if (layout) {
      e.dataTransfer.setData("heroLayout", layout)
    }
    e.dataTransfer.effectAllowed = "copy"
    setDraggingType(type)
    setShowHeroLayouts(false)
  }

  const handleDragEnd = () => {
    setDraggingType(null)
  }

  const handleHeroClick = () => {
    if (heroItemRef.current) {
      const rect = heroItemRef.current.getBoundingClientRect()
      const parentRect = heroItemRef.current.closest("aside")?.getBoundingClientRect()
      if (parentRect) {
        setHeroPopupPosition({ top: rect.top - parentRect.top })
      }
    }
    setShowHeroLayouts(!showHeroLayouts)
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
        {sectionTypes.map(({ type, label, icon, description }) => {
          const isHero = type === "hero"
          
          return (
            <div
              key={type}
              ref={isHero ? heroItemRef : undefined}
              draggable={!isHero}
              onClick={isHero && !collapsed ? handleHeroClick : undefined}
              onDragStart={isHero ? undefined : (e) => handleDragStart(e, type)}
              onDragEnd={handleDragEnd}
              className={`group relative flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-amber-400 active:scale-95 ${
                collapsed ? "justify-center px-2 py-3" : ""
              } ${draggingType === type ? "opacity-50 scale-95" : ""} ${
                isHero && !collapsed ? "cursor-pointer" : "cursor-move"
              } ${showHeroLayouts && isHero ? "border-amber-500 ring-2 ring-amber-200" : ""}`}
              title={collapsed ? `${label}: ${description}` : label}
            >
              <div className="flex-shrink-0 rounded-md bg-amber-50 p-2 text-amber-700 transition-colors group-hover:bg-amber-100">
                {icon}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{label}</span>
                    {isHero ? (
                      <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${showHeroLayouts ? "rotate-90" : ""}`} />
                    ) : (
                      <Plus className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {isHero ? "Click to choose layout" : description}
                  </p>
                </div>
              )}
              <div className={`absolute inset-0 rounded-lg bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 opacity-0 transition-opacity group-hover:opacity-100 ${collapsed ? "hidden" : ""}`} />
            </div>
          )
        })}
      </div>

      {/* Hero Layout Popup */}
      {showHeroLayouts && !collapsed && (
        <div
          ref={popupRef}
          className="absolute left-full top-0 z-50 ml-2 w-56 animate-in fade-in slide-in-from-left-2 duration-200"
          style={{ top: heroPopupPosition?.top ?? 0 }}
        >
          <div className="rounded-lg border bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Choose Hero Layout</h4>
              <button
                onClick={() => setShowHeroLayouts(false)}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {heroLayouts.map(({ layout, label, icon, description }) => (
                <div
                  key={layout}
                  draggable
                  onDragStart={(e) => handleDragStart(e, "hero", layout)}
                  onDragEnd={handleDragEnd}
                  className="group flex cursor-move items-center gap-3 rounded-md border bg-background p-2 transition-all hover:scale-[1.02] hover:border-amber-400 hover:shadow-sm active:scale-95"
                >
                  <div className="flex-shrink-0 rounded bg-amber-50 p-1.5 text-amber-700 group-hover:bg-amber-100">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{label}</span>
                      <Plus className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              Drag a layout to the canvas
            </p>
          </div>
        </div>
      )}

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
