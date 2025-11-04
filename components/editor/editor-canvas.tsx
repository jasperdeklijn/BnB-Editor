"use client"

import type React from "react"

import type { Section } from "@/lib/types"
import { SectionRenderer } from "./section-renderer"
import { Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditorCanvasProps {
  sections: Section[]
  setSections: (sections: Section[]) => void
  isPreview: boolean
  selectedSectionId: string | null
  onSectionSelect: (id: string | null) => void
}

export function EditorCanvas({
  sections,
  setSections,
  isPreview,
  selectedSectionId,
  onSectionSelect,
}: EditorCanvasProps) {
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newSections = [...sections]
    ;[newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]]
    setSections(newSections)
  }

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return
    const newSections = [...sections]
    ;[newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
    setSections(newSections)
  }

  const updateSection = (id: string, newData: Record<string, unknown>) => {
    setSections(
      sections.map((section) => (section.id === id ? { ...section, data: { ...section.data, ...newData } } : section)),
    )
  }

  return (
    <main className="flex-1 overflow-auto bg-muted/30" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className={isPreview ? "" : "p-8"}>
        {sections.length === 0 && !isPreview ? (
          <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
            <p className="text-muted-foreground">Drag and drop sections here to start building</p>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl">
            {sections.map((section, index) => (
              <div key={section.id} className={`group relative ${!isPreview ? "mb-4" : ""}`}>
                {!isPreview && (
                  <div className="absolute -left-12 top-4 z-10 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-transparent"
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
            ))}
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
