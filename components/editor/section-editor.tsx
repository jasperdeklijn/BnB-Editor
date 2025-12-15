"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Section, SectionStyles } from "@/lib/types"
import { EditableText } from "./editable-text"

interface SelectionEditorProps {
  selectedSection: Section | null
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onStyleUpdate: (styles: SectionStyles) => void
  onDelete: (id: string) => void
}

export function SelectionEditor({ selectedSection, onUpdate, onStyleUpdate, onDelete }: SelectionEditorProps) {
  const [localRooms, setLocalRooms] = useState<any[]>(() =>
    Array.isArray((selectedSection as any)?.data?.rooms) ? [...(selectedSection as any).data.rooms] : [],
  )

  if (!selectedSection) {
    return (
      <div className="w-80 border-l bg-background p-6">
        <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
          Select a section to edit its content
        </div>
      </div>
    )
  }

  const updateField = (field: string, value: any) => {
    onUpdate(selectedSection.id, { [field]: value })
  }

  const handleAddRoom = () => {
    const newRoom = { name: "New Room", description: "", price: "$0/night" }
    const updated = [...localRooms, newRoom]
    setLocalRooms(updated)
    onUpdate(selectedSection.id, { rooms: updated })
  }

  const handleUpdateRoom = (index: number, field: string, value: string) => {
    const updated = localRooms.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    setLocalRooms(updated)
    onUpdate(selectedSection.id, { rooms: updated })
  }

  const handleRemoveRoom = (index: number) => {
    const updated = localRooms.filter((_, i) => i !== index)
    setLocalRooms(updated)
    onUpdate(selectedSection.id, { rooms: updated })
  }

  return (
    <div className="w-80 border-l bg-background p-6 overflow-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit {selectedSection.type}</h2>
          <Button variant="ghost" size="sm" onClick={() => onDelete(selectedSection.id)} className="text-destructive">
            Delete
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Edit content for this section</p>
      </div>

      <div className="space-y-4">
        {selectedSection.type === "hero" && (
          <Card className="p-4 space-y-3">
            <Label>Title</Label>
            <EditableText
              value={(selectedSection.data as any).title || ""}
              onChange={(v) => updateField("title", v)}
              isPreview={false}
              as="h1"
            />
            <Label>Subtitle</Label>
            <EditableText
              value={(selectedSection.data as any).subtitle || ""}
              onChange={(v) => updateField("subtitle", v)}
              isPreview={false}
              as="p"
            />
            <Label>CTA Text</Label>
            <Input value={(selectedSection.data as any).ctaText || ""} onChange={(e) => updateField("ctaText", e.target.value)} />
          </Card>
        )}

        {selectedSection.type === "about" && (
          <Card className="p-4 space-y-3">
            <Label>Title</Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label>Description</Label>
            <EditableText
              value={(selectedSection.data as any).description || ""}
              onChange={(v) => updateField("description", v)}
              isPreview={false}
              as="p"
            />
          </Card>
        )}

        {selectedSection.type === "rooms" && (
          <Card className="p-4 space-y-3">
            <Label>Title</Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <div className="space-y-3">
              {localRooms.map((room, idx) => (
                <div key={idx} className="space-y-1 rounded border p-2">
                  <Input value={room.name} onChange={(e) => handleUpdateRoom(idx, "name", e.target.value)} />
                  <Input value={room.price} onChange={(e) => handleUpdateRoom(idx, "price", e.target.value)} />
                  <Input value={room.description} onChange={(e) => handleUpdateRoom(idx, "description", e.target.value)} />
                  <div className="flex justify-end">
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveRoom(idx)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button onClick={handleAddRoom}>Add Room</Button>
            </div>
          </Card>
        )}

        {selectedSection.type === "gallery" && (
          <Card className="p-4 space-y-3">
            <Label>Title</Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label>Image Count</Label>
            <Input
              type="number"
              value={(selectedSection.data as any).images || 0}
              onChange={(e) => updateField("images", Number(e.target.value))}
            />
          </Card>
        )}

        {selectedSection.type === "amenities" && (
          <Card className="p-4 space-y-3">
            <Label>Title</Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label>Items (comma separated)</Label>
            <Input
              value={((selectedSection.data as any).items || []).join(", ")}
              onChange={(e) => updateField("items", e.target.value.split(",").map((s) => s.trim()))}
            />
          </Card>
        )}

        {selectedSection.type === "contact" && (
          <Card className="p-4 space-y-3">
            <Label>Title</Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label>Address</Label>
            <Input value={(selectedSection.data as any).address || ""} onChange={(e) => updateField("address", e.target.value)} />
            <Label>Phone</Label>
            <Input value={(selectedSection.data as any).phone || ""} onChange={(e) => updateField("phone", e.target.value)} />
            <Label>Email</Label>
            <Input value={(selectedSection.data as any).email || ""} onChange={(e) => updateField("email", e.target.value)} />
          </Card>
        )}

        <Card className="p-4">
          <Label>Styles</Label>
          <div className="mt-2 flex gap-2 items-center">
            <Input
              placeholder="fontFamily"
              value={(selectedSection.styles as any)?.fontFamily || ""}
              onChange={(e) => onStyleUpdate({ ...(selectedSection.styles || {}), fontFamily: e.target.value })}
            />

            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">BG</span>
              <input
                type="color"
                aria-label="Background color"
                value={(selectedSection.styles as any)?.backgroundColor || "#ffffff"}
                onChange={(e) => onStyleUpdate({ ...(selectedSection.styles || {}), backgroundColor: e.target.value })}
                className="h-8 w-8 rounded border p-0"
              />
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Text</span>
              <input
                type="color"
                aria-label="Text color"
                value={(selectedSection.styles as any)?.textColor || "#000000"}
                onChange={(e) => onStyleUpdate({ ...(selectedSection.styles || {}), textColor: e.target.value })}
                className="h-8 w-8 rounded border p-0"
              />
            </label>
          </div>
        </Card>
        <Card className="p-4">
          <Label>Transition From Previous</Label>
          <div className="mt-2">
            <select
              value={(selectedSection.transitionFromPrev as any)?.type || "none"}
              onChange={(e) => {
                const v = e.target.value
                if (v === "none") {
                  onUpdate(selectedSection.id, { transitionFromPrev: null })
                } else {
                  onUpdate(selectedSection.id, { transitionFromPrev: { type: v } })
                }
              }}
              className="w-full rounded border px-2 py-1"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="gradient">Gradient</option>
              <option value="slide">Slide</option>
              <option value="wave">Wave</option>
              <option value="curve">Curve</option>
              <option value="diagonal">Diagonal</option>
              <option value="zigzag">Zigzag</option>
              <option value="split">Split</option>
            </select>
          </div>
        </Card>
      </div>
    </div>
  )
}
