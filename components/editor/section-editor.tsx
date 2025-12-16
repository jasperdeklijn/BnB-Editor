"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Section, SectionStyles } from "@/lib/types"
import { EditableText } from "./editable-text"
import {
  Trash2,
  Type,
  Palette,
  Wand2,
  Plus,
  Minus,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  DollarSign
} from "lucide-react"

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
      <div className="w-80 border-l bg-gradient-to-b from-background to-muted/20 p-6">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Wand2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No section selected</p>
          <p className="mt-2 text-xs text-muted-foreground">Click a section to customize</p>
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
    <div className="w-80 border-l bg-gradient-to-b from-background to-muted/20 p-6 overflow-auto animate-in slide-in-from-right duration-300">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-100 p-1.5 text-amber-700">
              <Type className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold capitalize">{selectedSection.type}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(selectedSection.id)}
            className="text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Customize content and styling</p>
      </div>

      <div className="space-y-4">
        {selectedSection.type === "hero" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Title
            </Label>
            <EditableText
              value={(selectedSection.data as any).title || ""}
              onChange={(v) => updateField("title", v)}
              isPreview={false}
              as="h1"
            />
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Subtitle
            </Label>
            <EditableText
              value={(selectedSection.data as any).subtitle || ""}
              onChange={(v) => updateField("subtitle", v)}
              isPreview={false}
              as="p"
            />
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              CTA Button Text
            </Label>
            <Input placeholder="e.g., Book Now" value={(selectedSection.data as any).ctaText || ""} onChange={(e) => updateField("ctaText", e.target.value)} />
          </Card>
        )}

        {selectedSection.type === "about" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Title
            </Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Description
            </Label>
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
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Title
            </Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5" />
                Rooms
              </Label>
              {localRooms.map((room, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border bg-muted/20 p-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Room {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveRoom(idx)}
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input placeholder="Room name" value={room.name} onChange={(e) => handleUpdateRoom(idx, "name", e.target.value)} />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input placeholder="Price" value={room.price} onChange={(e) => handleUpdateRoom(idx, "price", e.target.value)} />
                    </div>
                  </div>
                  <Input placeholder="Description" value={room.description} onChange={(e) => handleUpdateRoom(idx, "description", e.target.value)} />
                </div>
              ))}
              <Button onClick={handleAddRoom} className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </div>
          </Card>
        )}

        {selectedSection.type === "gallery" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Title
            </Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              Image Count
            </Label>
            <Input
              type="number"
              min="1"
              max="12"
              value={(selectedSection.data as any).images || 0}
              onChange={(e) => updateField("images", Number(e.target.value))}
            />
          </Card>
        )}

        {selectedSection.type === "amenities" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Title
            </Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              Amenities (comma separated)
            </Label>
            <Input
              placeholder="WiFi, Parking, Pool, Breakfast"
              value={((selectedSection.data as any).items || []).join(", ")}
              onChange={(e) => updateField("items", e.target.value.split(",").map((s) => s.trim()))}
            />
          </Card>
        )}

        {selectedSection.type === "contact" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Title
            </Label>
            <EditableText value={(selectedSection.data as any).title || ""} onChange={(v) => updateField("title", v)} isPreview={false} as="h2" />
            <Label className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Address
            </Label>
            <Input value={(selectedSection.data as any).address || ""} onChange={(e) => updateField("address", e.target.value)} />
            <Label className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </Label>
            <Input value={(selectedSection.data as any).phone || ""} onChange={(e) => updateField("phone", e.target.value)} />
            <Label className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Email
            </Label>
            <Input value={(selectedSection.data as any).email || ""} onChange={(e) => updateField("email", e.target.value)} />
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            Styles
          </Label>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 text-xs">Font Family</Label>
              <Input
                placeholder="e.g., font-serif"
                value={(selectedSection.styles as any)?.fontFamily || ""}
                onChange={(e) => onStyleUpdate({ ...(selectedSection.styles || {}), fontFamily: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="mb-2 flex items-center gap-1 text-xs">
                  <div className="h-3 w-3 rounded border bg-muted" />
                  Background
                </Label>
                <input
                  type="color"
                  aria-label="Background color"
                  value={(selectedSection.styles as any)?.backgroundColor || "#ffffff"}
                  onChange={(e) => onStyleUpdate({ ...(selectedSection.styles || {}), backgroundColor: e.target.value })}
                  className="h-9 w-full cursor-pointer rounded border"
                />
              </div>
              <div className="flex-1">
                <Label className="mb-2 flex items-center gap-1 text-xs">
                  <Type className="h-3 w-3" />
                  Text
                </Label>
                <input
                  type="color"
                  aria-label="Text color"
                  value={(selectedSection.styles as any)?.textColor || "#000000"}
                  onChange={(e) => onStyleUpdate({ ...(selectedSection.styles || {}), textColor: e.target.value })}
                  className="h-9 w-full cursor-pointer rounded border"
                />
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4 space-y-3">
          <Label className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5" />
            Transition
          </Label>
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent"
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
        </Card>
      </div>
    </div>
  )
}
