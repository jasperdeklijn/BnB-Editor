"use client"

import React, { useRef, useState } from "react"
import { Trash2, GripVertical, ChevronUp, ChevronDown, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Section, SectionType } from "@/lib/types"
import { SectionRenderer, TransitionWrapper } from "./section-renderer"

interface EditorCanvasProps {
  sections: Section[]
  setSections: (sections: Section[]) => void
  isPreview: boolean
  selectedSectionId: string | null
  onSectionSelect: (id: string | null) => void
  device: "desktop" | "tablet" | "mobile"
}

export function EditorCanvas({
  sections,
  setSections,
  isPreview,
  selectedSectionId,
  onSectionSelect,
  device,
}: EditorCanvasProps) {
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
    e.dataTransfer.dropEffect = sectionType ? "copy" : "move"

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
      default:
        return {}
    }
  }

  const handleDropOnGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()

    const sectionType = e.dataTransfer.getData("sectionType") as SectionType
    if (sectionType) {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        type: sectionType,
        data: getDefaultSectionData(sectionType),
        styles: {},
      }
      const newSections = [...sections]
      newSections.splice(index, 0, newSection)
      setSections(newSections)
      setHoverDropIndex(null)
      setIsDraggingNewSection(false)
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

  const handleDuplicate = (index: number) => {
    const section = sections[index]
    const newSection: Section = {
      ...section,
      id: `section-${Date.now()}`,
    }
    const newSections = [...sections]
    newSections.splice(index + 1, 0, newSection)
    setSections(newSections)
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
            <div className="flex min-h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      className={`absolute left-1/2 top-0 z-10 flex -translate-x-1/2 gap-1 rounded-lg border bg-background p-1 shadow-lg transition-all ${
                        selectedSectionId === section.id
                          ? "-translate-y-full opacity-100"
                          : "-translate-y-2 opacity-0 pointer-events-none"
                      }`}
                    >
                      <Button size="icon" variant="ghost" className="h-7 w-7 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSection(i, i - 1)}
                        disabled={i === 0}
                        className="h-7 w-7"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSection(i, i + 1)}
                        disabled={i === sections.length - 1}
                        className="h-7 w-7"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDuplicate(i)}
                        className="h-7 w-7"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div
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

            if (next?.transitionFromPrev?.type) {
              return (
                <TransitionWrapper
                  key={section.id}
                  type={next.transitionFromPrev.type}
                >
                  {content}
                </TransitionWrapper>
              )
            }

            return <React.Fragment key={section.id}>{content}</React.Fragment>
          })}
        </div>
      </div>
    </main>
  )
}
