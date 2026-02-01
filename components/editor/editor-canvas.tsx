"use client"

import React, { useRef, useState } from "react"
import { Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Section, SectionType, Transition } from "@/lib/types"
import { SectionRenderer } from "./section-renderer"
import websiteSections from "@/lib/supabase/websiteSections"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"

interface EditorCanvasProps {
  sections: Section[]
  setSections: (sections: Section[]) => void
  transitions: Transition[]
  isPreview: boolean
  selectedSectionId: string | null
  onSectionSelect: (id: string | null) => void
  device: "desktop" | "tablet" | "mobile"
  websiteId?: string | null
  supabase?: SupabaseClient
}

export function EditorCanvas({
  sections,
  setSections,
  transitions,
  isPreview,
  selectedSectionId,
  onSectionSelect,
  device,
  websiteId,
  supabase,
}: EditorCanvasProps) {
  function SectionTransition({
    type,
    from = {},
    to = {},
  }: {
    type: string
    from?: Record<string, unknown>
    to?: Record<string, unknown>
  }) {
    const fromBg = (from as any)?.backgroundColor || "#ffffff"
    const toBg = (to as any)?.backgroundColor || "#fff7ed"
    const height = 56

    const baseStyle: React.CSSProperties = {
      height,
      width: "100%",
    }

    if (type === "fade" || type === "gradient") {
      return (
        <div style={{ ...baseStyle, background: `linear-gradient(180deg, ${fromBg} 0%, ${toBg} 100%)` }} className="my-2 pointer-events-none" />
      )
    }

    if (type === "wave") {
      return (
        <div className="my-2 pointer-events-none" style={{ ...baseStyle, background: "transparent" }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full" style={{ display: "block" }}>
            <defs>
              <linearGradient id="grad-wave" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor={fromBg} stopOpacity="1" />
                <stop offset="100%" stopColor={toBg} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path d="M0,0 C150,60 350,0 600,40 C850,80 1050,20 1200,60 L1200,120 L0,120 Z" fill="url(#grad-wave)" />
          </svg>
        </div>
      )
    }

    if (type === "slide" || type === "curve" || type === "diagonal" || type === "zigzag" || type === "split") {
      return (
        <div style={{ ...baseStyle, background: `linear-gradient(180deg, ${fromBg} 0%, ${toBg} 100%)` }} className="my-2 pointer-events-none" />
      )
    }

    return null
  }
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [hoverDropIndex, setHoverDropIndex] = useState<number | null>(null)
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null)
  const [isDraggingNewSection, setIsDraggingNewSection] = useState(false)

  /* -----------------------------
     Drag & Drop helpers
  ------------------------------ */

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString())
    e.dataTransfer.effectAllowed = "move"
    setDraggingSectionIndex(index)
  }

  const handleDragEnd = () => {
    setDraggingSectionIndex(null)
    setHoverDropIndex(null)
    setIsDraggingNewSection(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const sectionType = e.dataTransfer.types.includes("sectiontype")
    e.dataTransfer.dropEffect = "move"

    if (sectionType) {
      setIsDraggingNewSection(true)
    }
  }

  const handleDragOverGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setHoverDropIndex(index)
  }

  const handleDragLeaveGap = () => {
    setHoverDropIndex(null)
  }

  const getDefaultSectionData = (type: SectionType): Record<string, unknown> => {
    switch (type) {
      case "hero":
        return {
          title: "Welcome to Our Bed & Breakfast",
          subtitle: "Experience comfort and hospitality",
          ctaText: "Book Now",
        }
      case "about":
        return {
          title: "About Us",
          description: "Learn about our story and what makes us special.",
        }
      case "rooms":
        return {
          title: "Our Rooms",
          rooms: [
            { name: "Deluxe Suite", description: "Spacious room with ocean view", price: "$150/night" },
          ],
        }
      case "gallery":
        return { title: "Gallery", images: 6 }
      case "amenities":
        return {
          title: "Amenities",
          amenities: ["Free WiFi", "Breakfast", "Parking", "Pool"],
        }
      case "contact":
        return {
          title: "Contact Us",
          address: "123 Main St, City, State 12345",
          phone: "(555) 123-4567",
          email: "info@bnb.com",
        }
      case "nav":
        return {
          brandName: "My B&B",
          isSticky: true,
          navLinks: [],
        }
      case "footer":
        return {
          brandName: "My B&B",
          copyright: `© ${new Date().getFullYear()} My B&B. All rights reserved.`,
        }
      default:
        return {}
    }
  }

  const handleDropOnGap = async (e: React.DragEvent, index: number) => {
    e.preventDefault()

    const sectionType = e.dataTransfer.getData("sectionType") as SectionType
    const heroLayout = e.dataTransfer.getData("heroLayout") as string | undefined
    
    if (sectionType) {
      const tempId = `section-${Date.now()}`
      const defaultData = getDefaultSectionData(sectionType)
      
      // If it's a hero section with a specific layout, include it in the data
      if (sectionType === "hero" && heroLayout) {
        defaultData.layout = heroLayout
      }
      
      const newSection: Section = {
        id: tempId,
        type: sectionType,
        data: defaultData,
        styles: {},
      }

      const newSections = [...sections]
      newSections.splice(index, 0, newSection)
      setSections(newSections)
      setHoverDropIndex(null)
      setIsDraggingNewSection(false)

      if (!websiteId) return

      try {
        const client = supabase ?? createClient()
        const payload = {
          type: sectionType,
          content: newSection.data ?? {},
          styles: newSection.styles ?? {},
          transition: null,
          position: index + 1,
        }
        const { data: created } = await websiteSections.createSection(websiteId, payload as any, client)
        if (created && created.id) {
          setSections(sections.map((s) => (s.id === tempId ? { ...s, id: created.id } : s)))
        }
      } catch (err) {
        // ignore persistence errors for now
      }
      return
    }

    const draggedIndexData = e.dataTransfer.getData("text/plain")
    const draggedIndex = Number.parseInt(draggedIndexData)

    if (Number.isNaN(draggedIndex)) return
    if (draggedIndex === index || draggedIndex === index - 1) {
      setHoverDropIndex(null)
      setDraggingSectionIndex(null)
      return
    }

    const newSections = [...sections]
    const [removed] = newSections.splice(draggedIndex, 1)
    const targetIndex = draggedIndex < index ? index - 1 : index
    newSections.splice(targetIndex, 0, removed)

    setSections(newSections)
    setHoverDropIndex(null)
    setDraggingSectionIndex(null)
  }

  const handleDragOverSection = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnSection = (e: React.DragEvent) => {
    e.preventDefault()
    setHoverDropIndex(null)
    setDraggingSectionIndex(null)
    setIsDraggingNewSection(false)
  }

  /* -----------------------------
     Section actions
  ------------------------------ */

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return
    const newSections = [...sections]
    const [item] = newSections.splice(from, 1)
    newSections.splice(to, 0, item)
    setSections(newSections)
  }

  // Animate reordering using FLIP when triggered by up/down buttons
  const moveSectionAnimated = async (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return

    // capture before positions
    const beforeRects = new Map<string, DOMRect>()
    sectionRefs.current.forEach((el, id) => {
      if (el) beforeRects.set(id, el.getBoundingClientRect())
    })

    // perform the reorder in state
    const newSections = [...sections]
    const [item] = newSections.splice(from, 1)
    newSections.splice(to, 0, item)
    setSections(newSections)

    // wait for DOM update
    await new Promise((res) => requestAnimationFrame(res))

    // capture after positions and apply inverse transforms
    sectionRefs.current.forEach((el, id) => {
      const before = beforeRects.get(id)
      const after = el?.getBoundingClientRect()
      if (!before || !after || !el) return
      const deltaY = before.top - after.top
      if (deltaY === 0) return

      // apply inverse transform instantly (no transition)
      el.style.transition = 'none'
      el.style.transform = `translateY(${deltaY}px)`

      // force reflow to make the transform take effect
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.getBoundingClientRect()

      // then animate to natural position
      requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms cubic-bezier(.2,.8,.2,1)'
        el.style.transform = 'translateY(0)'
      })

      const cleanup = () => {
        try {
          el.style.transition = ''
          el.style.transform = ''
        } catch (e) {
          /* ignore */
        }
        el.removeEventListener('transitionend', cleanup)
      }

      el.addEventListener('transitionend', cleanup)
      // safety cleanup
      setTimeout(cleanup, 350)
    })
  }

  const handleDelete = (id: string) => {
    setSections(sections.filter((s) => s.id !== id))
    if (selectedSectionId === id) {
      onSectionSelect(null)
    }
  }

  const updateSection = (id: string, newData: Partial<Section>) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, ...newData } : s)),
    )
  }

  /* -----------------------------
     Device width
  ------------------------------ */

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile":
        return "max-w-[375px]"
      case "tablet":
        return "max-w-[768px]"
      default:
        return "max-w-7xl"
    }
  }

  /* -----------------------------
     Render
  ------------------------------ */

  return (
    <main
      className="flex-1 overflow-auto bg-gradient-to-br from-muted/20 to-muted/40"
      onDrop={handleDropOnSection}
      onDragOver={handleDragOver}
    >
      <div className={isPreview ? "" : "p-8"}>
        <div className={`mx-auto ${getDeviceWidth()} transition-all duration-300`}>
          {!isPreview && sections.length === 0 && (
            <div
              className="flex min-h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background/50 animate-in fade-in slide-in-from-bottom-4 duration-500"
              onDragOver={(e) => handleDragOverGap(e, 0)}
              onDragLeave={handleDragLeaveGap}
              onDrop={(e) => handleDropOnGap(e, 0)}
            >
              <div className="text-center">
                <div className="mb-4 text-5xl">👋</div>
                <h3 className="mb-2 text-lg font-semibold">Start Building</h3>
                <p className="text-sm text-muted-foreground">Drag sections from the left to begin</p>
              </div>
            </div>
          )}

          {!isPreview && (
            <div
              className={`mb-4 transition-all duration-200 ${
                hoverDropIndex === 0 ? "h-16 opacity-100" : "h-2 opacity-0"
              }`}
              onDragOver={(e) => handleDragOverGap(e, 0)}
              onDragLeave={handleDragLeaveGap}
              onDrop={(e) => handleDropOnGap(e, 0)}
            >
              <div className="h-full rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 flex items-center justify-center">
                <span className="text-xs font-medium text-amber-700">Drop here</span>
              </div>
            </div>
          )}

          {sections.map((section, i) => {
            const next = sections[i + 1]
            const hasTransitionToNext = next && transitions.some(
              t => t.fromSectionId === section.id && t.toSectionId === next.id && t.type !== "none"
            )
            const transitionToNext = hasTransitionToNext 
              ? transitions.find(t => t.fromSectionId === section.id && t.toSectionId === next.id)
              : null

            const content = (
              <React.Fragment>
                <div
                  ref={(el) => {
                    if (el) sectionRefs.current.set(section.id, el)
                    else sectionRefs.current.delete(section.id)
                  }}
                  className={`group relative ${!isPreview ? "mb-4" : ""} ${
                    draggingSectionIndex === i ? "opacity-50" : ""
                  } transition-all duration-200`}
                  draggable={!isPreview}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOverSection}
                  onDrop={handleDropOnSection}
                >
                  {!isPreview && (
                    <div
                      className={`absolute section-actions left-1/2 top-0 z-10 flex -translate-x-1/2 gap-1 rounded-lg border bg-background p-1 shadow-lg transition-all ${
                        selectedSectionId === section.id
                          ? "-translate-y-full opacity-100"
                          : "-translate-y-2 opacity-0 pointer-events-none"
                      }`}
                    >
                      <Button size="icon" variant="ghost" className="h-7 w-7 cursor-grab active:cursor-grabbing popup-btn">
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSectionAnimated(i, i - 1)}
                        disabled={i === 0}
                        className="h-7 w-7 popup-btn"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSectionAnimated(i, i + 1)}
                        disabled={i === sections.length - 1}
                        className="h-7 w-7 popup-btn"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 popup-btn"
                        onClick={() => handleDelete(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div
                    id={isPreview && section.type !== "nav" && section.type !== "footer" ? `section-${section.id}` : undefined}
                    className={`${!isPreview ? "cursor-pointer rounded-lg border bg-background shadow-sm transition-all hover:shadow-md" : ""} ${
                      selectedSectionId === section.id && !isPreview
                        ? "ring-2 ring-amber-500 ring-offset-2 shadow-lg"
                        : ""
                    }`}
                    onClick={() =>
                      !isPreview &&
                      onSectionSelect(
                        selectedSectionId === section.id ? null : section.id,
                      )
                    }
                  >
                    <SectionRenderer
                      section={section}
                      isPreview={isPreview}
                      onUpdate={(data) => updateSection(section.id, data)}
                      wrapTransition={false}
                      allSections={sections}
                      device={device}
                    />
                  </div>
                </div>

                {!isPreview && (
                  <div
                    className={`transition-all duration-200 ${
                      hoverDropIndex === i + 1 ? "h-16 mb-4 opacity-100" : "h-2 mb-4 opacity-0"
                    }`}
                    onDragOver={(e) => handleDragOverGap(e, i + 1)}
                    onDragLeave={handleDragLeaveGap}
                    onDrop={(e) => handleDropOnGap(e, i + 1)}
                  >
                    <div className="h-full rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 flex items-center justify-center">
                      <span className="text-xs font-medium text-amber-700">Drop here</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )

            // If there's a transition to the next section, render an explicit
            // visual separator between this section and the next
            if (transitionToNext && next) {
              return (
                <React.Fragment key={section.id}>
                  {content}
                  <SectionTransition
                    type={transitionToNext.type}
                    from={section.styles as Record<string, unknown>}
                    to={next.styles as Record<string, unknown>}
                  />
                </React.Fragment>
              )
            }

            return <React.Fragment key={section.id}>{content}</React.Fragment>
          })}
        </div>
      </div>
    </main>
  )
}
