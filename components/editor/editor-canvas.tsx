"use client"

import React, { useRef, useState } from "react"
import { Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Section } from "@/lib/types"
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
  const [openTransitionIndex, setOpenTransitionIndex] = useState<number | null>(null)

  /* -----------------------------
     Drag & Drop helpers
  ------------------------------ */

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString())
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDragOverGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setHoverDropIndex(index)
  }

  const handleDropOnGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const draggedIndexData = e.dataTransfer.getData("text/plain")
    const draggedIndex = Number.parseInt(draggedIndexData)

    if (Number.isNaN(draggedIndex)) return
    if (draggedIndex === index || draggedIndex === index - 1) {
      setHoverDropIndex(null)
      return
    }

    const newSections = [...sections]
    const [removed] = newSections.splice(draggedIndex, 1)
    const targetIndex = draggedIndex < index ? index - 1 : index
    newSections.splice(targetIndex, 0, removed)

    setSections(newSections)
    setHoverDropIndex(null)
  }

  const handleDragOverSection = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnSection = (e: React.DragEvent) => {
    e.preventDefault()
    setHoverDropIndex(null)
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
      className="flex-1 overflow-auto bg-muted/30"
      onDrop={handleDropOnSection}
      onDragOver={handleDragOver}
    >
      <div className={isPreview ? "" : "p-8"}>
        <div className={`mx-auto ${getDeviceWidth()}`}>
          {sections.map((section, i) => {
            const next = sections[i + 1]

            const content = (
              <div
                ref={(el) => {
                  if (el) sectionRefs.current.set(section.id, el)
                  else sectionRefs.current.delete(section.id)
                }}
                className={`group relative ${!isPreview ? "mb-4" : ""}`}
                draggable={!isPreview}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={handleDragOverSection}
                onDrop={handleDropOnSection}
              >
                {!isPreview && (
                  <div
                    className={`absolute left-1/2 top-0 z-10 flex -translate-x-1/2 gap-1 rounded-md border bg-background p-1 shadow-sm transition-all ${
                      selectedSectionId === section.id
                        ? "-translate-y-full opacity-100"
                        : "-translate-y-2 opacity-0 pointer-events-none"
                    }`}
                  >
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveSection(i, i - 1)}
                      disabled={i === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveSection(i, i + 1)}
                      disabled={i === sections.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(section.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div
                  className={`${!isPreview ? "cursor-pointer rounded-lg border bg-background shadow-sm" : ""} ${
                    selectedSectionId === section.id && !isPreview
                      ? "ring-2 ring-amber-500 ring-offset-2"
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
