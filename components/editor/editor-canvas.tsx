"use client"

import React, { useRef, useState } from "react"
import { Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Section } from "@/lib/types"
import { SectionRenderer } from "./section-renderer"

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
  const [openTransitionIndex, setOpenTransitionIndex] = useState<number | null>(null)

  const moveSection = (from: number, to: number) => {
    if (from === to) return

    const refs = sectionRefs.current

    // Record current positions (FLIP technique)
    const oldRects = new Map<string, DOMRect>()
    sections.forEach((s) => {
      const el = refs.get(s.id)
      if (el) oldRects.set(s.id, el.getBoundingClientRect())
    })

    // Build the new order and update state
    const newSections = [...sections]
    const [moved] = newSections.splice(from, 1)
    newSections.splice(to, 0, moved)
    setSections(newSections)

    // After DOM updates, play the flip animation
    requestAnimationFrame(() => {
      newSections.forEach((s) => {
        const el = refs.get(s.id)
        const oldRect = oldRects.get(s.id)
        if (!el || !oldRect) return

        const newRect = el.getBoundingClientRect()
        const deltaY = oldRect.top - newRect.top
        if (deltaY === 0) return

        // Apply inverse transform, then animate to zero
        el.style.transition = 'none'
        el.style.transform = `translateY(${deltaY}px)`

        // Force layout so the browser picks up the starting transform
        void el.getBoundingClientRect()

        el.style.transition = 'transform 200ms ease'
        el.style.transform = ''

        const cleanup = () => {
          el.style.transition = ''
          el.style.transform = ''
          el.removeEventListener('transitionend', cleanup)
        }

        el.addEventListener('transitionend', cleanup)
      })
    })
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const sectionType = e.dataTransfer.getData("sectionType")

    if (sectionType) {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        type: sectionType as Section["type"],
        data: getDefaultData(sectionType as Section["type"]),
      }

      setSections([...sections, newSection])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleDelete = (id: string) => {
    setSections(sections.filter((s) => s.id !== id))
    if (selectedSectionId === id) {
      onSectionSelect(null)
    }
  }

  const updateSection = (id: string, newData: Record<string, unknown>) => {
    setSections(
      sections.map((section) => (section.id === id ? { ...section, data: { ...section.data, ...newData } } : section)),
    )
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("draggedIndex", index.toString())
  }

  const handleDragOverSection = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDropOnSection = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedIndex = Number.parseInt(e.dataTransfer.getData("draggedIndex"))
    if (isNaN(draggedIndex) || draggedIndex === dropIndex) return

    const newSections = [...sections]
    const [draggedSection] = newSections.splice(draggedIndex, 1)
    newSections.splice(dropIndex, 0, draggedSection)
    setSections(newSections)
  }

  const handleDragOverGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    // If dragging a new section from palette, show copy; otherwise move
    const isNew = !!e.dataTransfer.getData("sectionType")
    e.dataTransfer.dropEffect = isNew ? "copy" : "move"
    setHoverDropIndex(index)
  }

  const handleDropOnGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()

    const sectionType = e.dataTransfer.getData("sectionType")
    const draggedIndexData = e.dataTransfer.getData("draggedIndex")

    if (sectionType) {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        type: sectionType as Section["type"],
        data: getDefaultData(sectionType as Section["type"]),
      }

      const newSections = [...sections]
      newSections.splice(index, 0, newSection)
      setSections(newSections)
      setHoverDropIndex(null)
      return
    }

    const draggedIndex = Number.parseInt(draggedIndexData)
    if (!isNaN(draggedIndex)) {
      if (draggedIndex === index || draggedIndex === index - 1) {
        setHoverDropIndex(null)
        return
      }

      const newSections = [...sections]
      const [removed] = newSections.splice(draggedIndex, 1)
      // Adjust target index if removal happened before the target
      const targetIndex = draggedIndex < index ? index - 1 : index
      newSections.splice(targetIndex, 0, removed)
      setSections(newSections)
      setHoverDropIndex(null)
    }
  }

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

  return (
    <main className="flex-1 overflow-auto bg-muted/30" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className={isPreview ? "" : "p-8"}>
        {sections.length === 0 && !isPreview ? (
          <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
            <p className="text-muted-foreground">Drag and drop sections here to start building</p>
          </div>
        ) : (
          <div className={`mx-auto ${getDeviceWidth()}`}>
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                {!isPreview && (
                  <div
                    onDragOver={(e) => handleDragOverGap(e, index)}
                    onDragLeave={() => setHoverDropIndex(null)}
                    onDrop={(e) => handleDropOnGap(e, index)}
                    className={`h-10 my-2 rounded transition-all flex items-center justify-center ${
                      hoverDropIndex === index ? "bg-amber-300/40 border-2 border-amber-400" : ""
                    }`}
                  >
                    {hoverDropIndex === index ? null : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenTransitionIndex(openTransitionIndex === index ? null : index)}
                          className="rounded-md border px-3 py-1 text-sm bg-background shadow-sm"
                        >
                          Add transition
                        </button>

                        {openTransitionIndex === index && (
                          <div className="ml-2 flex gap-1 rounded-md border bg-background p-1 shadow-sm max-w-xl flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "fade" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Fade
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "gradient" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Gradient
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "slide" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Slide
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "wave" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Wave
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "curve" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Curve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "diagonal" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Diagonal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "zigzag" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Zigzag
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "split" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10"
                            >
                              Split
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sections[index]) {
                                  const newSections = [...sections]
                                  newSections[index] = {
                                    ...newSections[index],
                                    transitionFromPrev: { type: "none" },
                                  }
                                  setSections(newSections)
                                }
                                setOpenTransitionIndex(null)
                              }}
                              className="px-2 py-1 text-xs rounded hover:bg-muted/10 text-destructive"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div
                  ref={(el) => {
                    if (el) sectionRefs.current.set(section.id, el)
                    else sectionRefs.current.delete(section.id)
                  }}
                  className={`group relative ${!isPreview ? "mb-4" : ""}`}
                  draggable={!isPreview}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOverSection(e, index)}
                  onDrop={(e) => handleDropOnSection(e, index)}
                >
                  {!isPreview && (
                    <div
                      className={
                        `absolute left-1/2 top-0 z-10 flex -translate-x-1/2 flex-row gap-1 rounded-md border bg-background p-1 shadow-sm transition-all duration-150 ease-out` +
                        (selectedSectionId === section.id
                          ? ' -translate-y-full opacity-100 scale-100'
                          : ' -translate-y-2 opacity-0 scale-95 pointer-events-none')
                      }
                      aria-hidden={selectedSectionId !== section.id}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 cursor-move"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <div className="w-px bg-border my-auto" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveSection(index, index - 1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveSection(index, index + 1)}
                        disabled={index === sections.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div className="w-px bg-border my-auto" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div
                    className={`${!isPreview ? "cursor-pointer rounded-lg border bg-background shadow-sm transition-all" : ""} ${
                      selectedSectionId === section.id && !isPreview ? "ring-2 ring-amber-500 ring-offset-2" : ""
                    }`}
                    onClick={() => !isPreview && onSectionSelect(section.id)}
                  >
                    <SectionRenderer
                      section={section}
                      isPreview={isPreview}
                      onUpdate={(newData) => updateSection(section.id, newData)}
                    />
                  </div>
                </div>
              </React.Fragment>
            ))}

            {!isPreview && (
              <div
                onDragOver={(e) => handleDragOverGap(e, sections.length)}
                onDragLeave={() => setHoverDropIndex(null)}
                onDrop={(e) => handleDropOnGap(e, sections.length)}
                className={`h-10 my-4 rounded transition-all flex items-center justify-center ${
                  hoverDropIndex === sections.length ? "bg-amber-300/40 border-2 border-amber-400" : ""
                }`}
              >
                {hoverDropIndex === sections.length ? null : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled
                      className="rounded-md border px-3 py-1 text-sm bg-muted-foreground/5 text-muted-foreground cursor-not-allowed"
                    >
                      Add transition
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function getDefaultData(type: Section["type"]): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        title: "Welcome to Our Cozy Bed & Breakfast",
        subtitle: "Experience comfort and hospitality in the heart of the city",
        ctaText: "Book Your Stay",
      }
    case "about":
      return {
        title: "About Our BnB",
        description:
          "We offer a warm, welcoming atmosphere with modern amenities and personalized service. Our historic building has been lovingly restored to provide the perfect blend of charm and comfort.",
      }
    case "rooms":
      return {
        title: "Our Rooms",
        rooms: [
          { name: "Deluxe Suite", description: "Spacious room with king bed", price: "$150/night" },
          { name: "Standard Room", description: "Cozy room with queen bed", price: "$100/night" },
          { name: "Garden View", description: "Room overlooking our garden", price: "$120/night" },
        ],
      }
    case "gallery":
      return {
        title: "Gallery",
        images: 6,
      }
    case "amenities":
      return {
        title: "Amenities",
        items: ["Free WiFi", "Breakfast Included", "Parking", "Air Conditioning", "Pet Friendly", "Garden"],
      }
    case "contact":
      return {
        title: "Get in Touch",
        address: "123 Main Street, City, State 12345",
        phone: "(555) 123-4567",
        email: "info@bnb.com",
      }
    default:
      return {}
  }
}
